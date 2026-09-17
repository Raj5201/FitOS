
const DB_KEY="fitos_v1";
const MEALS=["Breakfast","Mid-Morning Snack","Lunch","Evening Snack","Dinner"];
const BODY_REFS={
 Male:{Lean:"Ishaan Khatter",Athletic:"Vicky Kaushal",Muscular:"Hrithik Roshan",Strong:"John Abraham"},
 Female:{Lean:"Ananya Panday",Athletic:"Katrina Kaif",Muscular:"Disha Patani",Strong:"Taapsee Pannu"}
};
const ACTIVITY=[
 {id:"sedentary",name:"Mostly sitting",factor:1.2,desc:"Desk/study day, little walking, usually under ~5k steps."},
 {id:"light",name:"Lightly active",factor:1.35,desc:"Mostly sitting, but ~5–7k steps or 1–2 workouts/week."},
 {id:"moderate",name:"Moderately active",factor:1.5,desc:"~7–10k steps or 3–4 workouts/week."},
 {id:"very",name:"Very active",factor:1.7,desc:"10k+ steps or hard training around 5–6 days/week."},
 {id:"high",name:"Highly active",factor:1.85,desc:"Physical job and/or serious training most days."}
];
const SPLITS={
 3:["Full Body A","Full Body B","Full Body C"],
 4:["Upper A","Lower A","Upper B","Lower B"],
 5:["Push","Pull","Legs","Upper","Lower"],
 6:["Push","Pull","Legs","Push","Pull","Legs"]
};
const FOUR_DAY_AB_PLAN={
 "Day A":[
  {id:"ex_003",sets:3},{id:"ex_011",sets:3},{id:"ex_025",sets:3},{id:"ex_094",sets:3},{id:"ex_055",sets:3},
  {id:"ex_068",sets:3},{id:"ex_015",sets:3},{id:"ex_081",sets:3},{id:"ex_090",sets:3},{id:"ex_091",sets:3}
 ],
 "Day B":[
  {id:"ex_007",sets:3},{id:"ex_012",sets:3},{id:"ex_092",sets:3},{id:"ex_020",sets:3},{id:"ex_052",sets:3},
  {id:"ex_058",sets:3},{id:"ex_093",sets:3},{id:"ex_080",sets:3},{id:"ex_082",sets:3},{id:"ex_024",sets:2}
 ]
};
const STANDARD_ITEMS={
 food_0056:{unit:"quantity",gramsEach:118,label:"banana"},food_0057:{unit:"quantity",gramsEach:182,label:"apple"},
 food_0066:{unit:"quantity",gramsEach:12,label:"strawberry"},food_0069:{unit:"quantity",gramsEach:24,label:"date"},
 food_0075:{unit:"quantity",gramsEach:150,label:"avocado"},food_0103:{unit:"quantity",gramsEach:50,label:"egg"},
 food_0104:{unit:"quantity",gramsEach:33,label:"egg white"},food_0105:{unit:"quantity",gramsEach:46,label:"egg"},
 food_0106:{unit:"quantity",gramsEach:61,label:"egg"},food_0108:{unit:"quantity",gramsEach:50,label:"egg"},
 food_0111:{unit:"quantity",gramsEach:17,label:"egg yolk"},food_0159:{unit:"quantity",gramsEach:2,label:"blueberry"},
 food_0160:{unit:"quantity",gramsEach:12,label:"strawberry"},food_0165:{unit:"quantity",gramsEach:50,label:"egg"},
 food_0166:{unit:"quantity",gramsEach:33,label:"egg white"}
};

let db=loadDB();
let activeDate=today();
let onboarding={step:0,sex:"",age:"",heightUnit:"cm",heightCm:"",heightFt:"",heightIn:"",weightUnit:"kg",weight:"",activity:"",targetWeight:"",bodyType:"",goal:"",days:4,duration:60};

function blankDB(){
 return {profile:null,weights:{},steps:{},skips:{},nutrition:{},workouts:{},measurements:{},settings:{exerciseCalorieCredit:.5},customFoods:[],recipes:[],savedMeals:[],lastBackup:null};
}
function loadDB(){
 try{
   const x=JSON.parse(localStorage.getItem(DB_KEY))||blankDB();
   if(!x.recipes)x.recipes=[];
   if(!x.customFoods)x.customFoods=[];
   if(!x.settings)x.settings={exerciseCalorieCredit:.5};
   if(!x.steps)x.steps={};
   if(x.profile&&!x.profile.stepTarget)x.profile.stepTarget=defaultStepTarget(x.profile.activity);
   return x;
 }catch{return blankDB()}
}
function saveDB(){localStorage.setItem(DB_KEY,JSON.stringify(db))}
function today(){
 const d=new Date();
 return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function datePretty(s=today()){return new Date(s+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"})}
function weekKey(s=today()){const d=new Date(s+"T12:00:00");const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d.toISOString().slice(0,10)}
function kgFrom(v,unit){return unit==="lb"?Number(v)/2.20462:Number(v)}
function displayWeight(kg){return db.profile?.weightUnit==="lb"?(kg*2.20462):kg}
function round(n,d=0){const p=10**d;return Math.round(n*p)/p}
function toast(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.remove("hidden");setTimeout(()=>t.classList.add("hidden"),1500)}
function calcHeightCm(o){return o.heightUnit==="cm"?Number(o.heightCm):(Number(o.heightFt)*30.48+Number(o.heightIn)*2.54)}
function activityFactor(id){return ACTIVITY.find(x=>x.id===id)?.factor||1.2}
function defaultStepTarget(activity){return {sedentary:6000,light:7500,moderate:9000,very:11000,high:12000}[activity]||8000}
function bmr(sex,kg,cm,age){return 10*kg+6.25*cm-5*age+(sex==="Male"?5:-161)}
function calcTargets(profile,currentKg){
 const maintenance=Math.round(bmr(profile.sex,currentKg,profile.heightCm,profile.age)*activityFactor(profile.activity));
 const goal=profile.goal; let delta=0;
 if(goal==="Lose fat") delta=-400;
 if(goal==="Gain muscle") delta=250;
 if(goal==="Recomp") delta=-100;
 const kcal=Math.max(1200,maintenance+delta);
 const protein=Math.round(currentKg*(goal==="Gain muscle"||goal==="Recomp"?1.9:1.8));
 const fat=Math.round(currentKg*.8);
 const carbs=Math.max(0,Math.round((kcal-protein*4-fat*9)/4));
 return {maintenance,kcal,protein,fat,carbs};
}
function currentWeightKg(){
 const entries=Object.entries(db.weights).sort(([a],[b])=>b.localeCompare(a));
 return entries.length?entries[0][1]:db.profile.startWeightKg;
}
function weightAt(date=activeDate){
 const entries=Object.entries(db.weights).filter(([d])=>d<=date).sort(([a],[b])=>b.localeCompare(a));
 return entries.length?entries[0][1]:db.profile.startWeightKg;
}
function todayNutrition(date=activeDate){
 const d=date;if(!db.nutrition[d])db.nutrition[d]={water:0,items:[]};return db.nutrition[d];
}
function getFoodById(id){return [...FOOD_LIBRARY,...db.customFoods].find(f=>f.food_id===id)}
function foodMeasure(f){
 const standard=STANDARD_ITEMS[f.food_id];
 if(standard)return standard;
 const name=f.name.toLowerCase(),solidException=/watermelon|canned in water|powder|dry mix|coffee bean|coffee ground|tea leaves|ice cream|cream cheese|whipped cream|concentrate/.test(name);
 const looksLiquid=/\b(milk|juice|water|coffee|tea|soda|cola|beverage|drink|broth|beer|wine|smoothie|shake|buttermilk|cream)\b/.test(name);
 if((f.default_unit==="ml"&&!solidException)||(looksLiquid&&!solidException))return {unit:"ml",label:"ml"};
 if(f.default_unit==="quantity")return {unit:"quantity",gramsEach:Number(f.grams_each)||null,label:"item"};
 return {unit:"g",label:"g"};
}
function foodRatio(f,amount){
 const measure=foodMeasure(f);
 if(measure.unit==="quantity"&&measure.gramsEach)return Number(amount)*measure.gramsEach/Number(f.nutrition_basis_amount||100);
 return Number(amount)/Number(f.nutrition_basis_amount||100);
}
function foodDefaultAmount(f){return foodMeasure(f).unit==="quantity"?1:Number(f.default_amount||100)}
function foodAmountText(f,amount){const m=foodMeasure(f);return m.unit==="quantity"?`${amount} ${m.label}${Number(amount)===1?"":"s"}`:`${amount}${m.unit}`}
function foodBasisText(f){const m=foodMeasure(f);return m.unit==="quantity"?`1 ${m.label}${m.gramsEach?` (~${m.gramsEach}g)`:""}`:`${f.nutrition_basis_amount||100}${m.unit}`}
function mealTotals(date=activeDate){
 const n=db.nutrition[date]||{items:[]}; return n.items.reduce((a,it)=>{
   const f=getFoodById(it.foodId); if(!f)return a;
   const ratio=foodRatio(f,it.amount);
   a.kcal+=Number(f.calories_kcal||0)*ratio;a.p+=Number(f.protein_g||0)*ratio;a.c+=Number(f.carbs_g||0)*ratio;a.f+=Number(f.fat_g||0)*ratio;a.fiber+=Number(f.fiber_g||0)*ratio;return a;
 },{kcal:0,p:0,c:0,f:0,fiber:0});
}
function exerciseCredit(date=activeDate){
 const w=db.workouts[date]; if(!w)return 0;
 return Math.round((Number(w.cardioCalories||0)+Number(w.liftingCalories||0))*(db.settings.exerciseCalorieCredit??.5));
}
function dynamicTargets(date=activeDate){
 const base=calcTargets(db.profile,weightAt(date)); return {...base,kcal:base.kcal+exerciseCredit(date)};
}

function start(){
 if(!db.profile){show("onboarding");renderOnboarding();return}
 if(db.profile.planVersion!=="balanced_v2"){buildWeeklyTemplate();saveDB()}
 if(!db.weights[today()]&&!db.skips[today()]){show("weightGate");renderGate();return}
 show("mainApp");renderAll();
}
function show(id){["onboarding","weightGate","mainApp"].forEach(x=>document.getElementById(x).classList.toggle("hidden",x!==id))}

function renderOnboarding(){
 const wrap=document.getElementById("onboardStep"); const s=onboarding.step;
 if(s===0){
   wrap.innerHTML=`<div class="step-wrap"><div class="eyebrow">1 OF 6</div><h1>Tell us the basics.</h1><p class="lead">Just enough to estimate your starting calories and build the right plan.</p>
   <div class="option-grid">${["Male","Female"].map(x=>`<button class="option ${onboarding.sex===x?"selected":""}" onclick="setOn('sex','${x}')">${x}</button>`).join("")}</div>
   <div class="form-stack"><label>Age<input id="oAge" type="number" value="${onboarding.age}" placeholder="25"></label>
   <label>Height unit<select id="oHeightUnit"><option ${onboarding.heightUnit==="cm"?"selected":""}>cm</option><option ${onboarding.heightUnit==="ft/in"?"selected":""}>ft/in</option></select></label>
   <div id="heightFields"></div>
   <label>Weight unit<select id="oWeightUnit"><option ${onboarding.weightUnit==="kg"?"selected":""}>kg</option><option ${onboarding.weightUnit==="lb"?"selected":""}>lb</option></select></label>
   <label>Current weight<input id="oWeight" type="number" step=".1" value="${onboarding.weight}" placeholder="68.0"></label></div>
   ${nextBtn()}`;
   hookBasic();
 } else if(s===1){
   wrap.innerHTML=`<div class="step-wrap"><div class="eyebrow">2 OF 6</div><h1>How active is normal life?</h1><p class="lead">Pick the one that sounds most like a typical week — not your best week.</p>
   <div class="form-stack">${ACTIVITY.map(a=>`<button class="option ${onboarding.activity===a.id?"selected":""}" onclick="setOn('activity','${a.id}')"><strong>${a.name}</strong><small>${a.desc}</small></button>`).join("")}</div>${navBtns()}`;
 } else if(s===2){
   wrap.innerHTML=`<div class="step-wrap"><div class="eyebrow">3 OF 6</div><h1>What are you chasing?</h1>
   <div class="option-grid">${["Lose fat","Maintain","Gain muscle","Recomp"].map(x=>`<button class="option ${onboarding.goal===x?"selected":""}" onclick="setOn('goal','${x}')">${x}</button>`).join("")}</div>
   <div class="form-stack"><label>Target body weight<input id="oTargetWeight" type="number" step=".1" value="${onboarding.targetWeight}" placeholder="75"></label></div>${navBtns()}`;
   document.getElementById("oTargetWeight").oninput=e=>onboarding.targetWeight=e.target.value;
 } else if(s===3){
   const refs=onboarding.sex?BODY_REFS[onboarding.sex]:BODY_REFS.Male;
   wrap.innerHTML=`<div class="step-wrap"><div class="eyebrow">4 OF 6</div><h1>Choose the direction.</h1><p class="lead">These are visual goal styles, not promises of an exact look.</p>
   <div class="option-grid">${Object.keys(refs).map(x=>`<button class="option bodytype-card ${onboarding.bodyType===x?"selected":""}" onclick="setOn('bodyType','${x}')"><strong>${x}</strong><small>${bodyDesc(x)}</small><div class="reference">Reference: ${refs[x]}</div></button>`).join("")}</div>${navBtns()}`;
 } else if(s===4){
   wrap.innerHTML=`<div class="step-wrap"><div class="eyebrow">5 OF 6</div><h1>How much can you actually train?</h1>
   <div class="form-stack"><label>Days per week<select id="oDays">${[3,4,5,6].map(x=>`<option ${onboarding.days==x?"selected":""}>${x}</option>`).join("")}</select></label>
   <label>Session length<select id="oDuration">${[30,45,60,90].map(x=>`<option ${onboarding.duration==x?"selected":""}>${x} min</option>`).join("")}</select></label></div>${navBtns()}`;
   document.getElementById("oDays").onchange=e=>onboarding.days=Number(e.target.value);
   document.getElementById("oDuration").onchange=e=>onboarding.duration=Number(e.target.value);
 } else {
   const p=previewProfile(), t=calcTargets(p,p.startWeightKg), bmi=p.startWeightKg/((p.heightCm/100)**2);
   wrap.innerHTML=`<div class="step-wrap"><div class="eyebrow">6 OF 6</div><h1>Your starting point.</h1><p class="lead">We'll adjust using your weight trend — not random day-to-day fluctuations.</p>
   <div class="metric-grid">
   ${metric("BMI",round(bmi,1))}${metric("Maintenance",t.maintenance+" kcal")}${metric("Daily target",t.kcal+" kcal")}${metric("Protein",t.protein+" g")}
   </div>
   <div class="card"><strong>${p.goal} → ${p.bodyType}</strong><p class="muted">Suggested split: ${splitName(p.days)} • ${p.days} days/week • ${p.duration} min</p><p class="muted">Safe pace: ${safePace(p.goal)}</p></div>
   <button class="primary" onclick="finishOnboarding()">Build my plan</button><button class="ghost" onclick="backOn()">Back</button></div>`;
 }
}
function bodyDesc(x){return {Lean:"Lower-fat, slimmer, lightly defined.",Athletic:"Lean with more visible muscle and balanced development.",Muscular:"Noticeably more muscle mass and definition.",Strong:"Size and strength prioritized over staying very lean."}[x]}
function nextBtn(){return `<div class="onboard-actions"><button class="primary" onclick="nextOn()">Continue</button></div>`}
function navBtns(){return `<div class="onboard-actions"><button class="secondary" onclick="backOn()">Back</button><button class="primary" onclick="nextOn()">Continue</button></div>`}
window.setOn=(k,v)=>{onboarding[k]=v;renderOnboarding()}
window.backOn=()=>{onboarding.step=Math.max(0,onboarding.step-1);renderOnboarding()}
window.nextOn=()=>{
 if(onboarding.step===0){syncBasic();if(!onboarding.sex||!onboarding.age||!onboarding.weight||calcHeightCm(onboarding)<=0)return toast("Complete the basics first")}
 if(onboarding.step===1&&!onboarding.activity)return toast("Choose your activity level");
 if(onboarding.step===2){const e=document.getElementById("oTargetWeight");if(e)onboarding.targetWeight=e.value;if(!onboarding.goal||!onboarding.targetWeight)return toast("Choose a goal and target weight")}
 if(onboarding.step===3&&!onboarding.bodyType)return toast("Choose a body type");
 onboarding.step++;renderOnboarding();
}
function hookBasic(){
 const hu=document.getElementById("oHeightUnit"); const wu=document.getElementById("oWeightUnit");
 hu.onchange=e=>{onboarding.heightUnit=e.target.value;renderHeightFields()};wu.onchange=e=>onboarding.weightUnit=e.target.value;
 ["oAge","oWeight"].forEach(id=>document.getElementById(id).oninput=syncBasic);renderHeightFields();
}
function renderHeightFields(){
 const box=document.getElementById("heightFields");if(!box)return;
 box.innerHTML=onboarding.heightUnit==="cm"?`<label>Height<input id="oHeightCm" type="number" value="${onboarding.heightCm}" placeholder="178"></label>`:`<div class="option-grid"><label>Feet<input id="oHeightFt" type="number" value="${onboarding.heightFt}" placeholder="5"></label><label>Inches<input id="oHeightIn" type="number" value="${onboarding.heightIn}" placeholder="10"></label></div>`;
 ["oHeightCm","oHeightFt","oHeightIn"].forEach(id=>{const e=document.getElementById(id);if(e)e.oninput=syncBasic});
}
function syncBasic(){
 const get=id=>document.getElementById(id)?.value;
 onboarding.age=get("oAge")||onboarding.age;onboarding.weight=get("oWeight")||onboarding.weight;
 onboarding.heightCm=get("oHeightCm")||onboarding.heightCm;onboarding.heightFt=get("oHeightFt")||onboarding.heightFt;onboarding.heightIn=get("oHeightIn")||onboarding.heightIn;
}
function previewProfile(){return {sex:onboarding.sex,age:Number(onboarding.age),heightCm:calcHeightCm(onboarding),weightUnit:onboarding.weightUnit,startWeightKg:kgFrom(onboarding.weight,onboarding.weightUnit),activity:onboarding.activity,targetWeightKg:kgFrom(onboarding.targetWeight,onboarding.weightUnit),bodyType:onboarding.bodyType,goal:onboarding.goal,days:Number(onboarding.days),duration:Number(onboarding.duration),stepTarget:defaultStepTarget(onboarding.activity),createdAt:today()}}
function safePace(goal){return goal==="Lose fat"?"About 0.5–0.75% body weight/week":goal==="Gain muscle"?"Slow gain: roughly 0.1–0.25%/week":goal==="Recomp"?"Scale may move slowly; strength and waist matter more":"Hold roughly steady"}
function splitName(days){return days===3?"Full Body":days===4?"Full Body A / B":days===5?"PPL + Upper / Lower":"Push / Pull / Legs"}
window.finishOnboarding=()=>{
 db.profile=previewProfile(); db.weights[today()]=db.profile.startWeightKg; buildWeeklyTemplate();saveDB();show("mainApp");renderAll();toast("Plan built");
}

function renderGate(){
 document.getElementById("gateDate").textContent=datePretty().toUpperCase();document.getElementById("gateWeightUnit").textContent=db.profile.weightUnit;
 const used=Object.keys(db.skips).filter(d=>weekKey(d)===weekKey(today())).length;document.getElementById("skipCountText").textContent=`(${used}/2 used)`;
 document.getElementById("skipWeightBtn").disabled=used>=2;
}
document.getElementById("saveWeightBtn").onclick=()=>{const v=Number(document.getElementById("gateWeight").value);if(!v)return toast("Enter today's weight");db.weights[today()]=kgFrom(v,db.profile.weightUnit);saveDB();show("mainApp");renderAll()}
document.getElementById("skipWeightBtn").onclick=()=>{const used=Object.keys(db.skips).filter(d=>weekKey(d)===weekKey(today())).length;if(used>=2)return toast("You've used both skips this week");db.skips[today()]=true;saveDB();show("mainApp");renderAll()}

function buildWeeklyTemplate(){
 db.profile.planVersion="balanced_v2";
 if(Number(db.profile.days)===4){db.profile.weeklyTemplate={1:"Day A",2:"Day B",4:"Day A",6:"Day B"};return}
 db.profile.weeklyTemplate={};const splits=SPLITS[db.profile.days],weekdays=[1,2,3,4,5,6,0];
 weekdays.slice(0,db.profile.days).forEach((day,i)=>db.profile.weeklyTemplate[day]=splits[i]);
}
function recommendExercises(split,duration){
 if(FOUR_DAY_AB_PLAN[split])return FOUR_DAY_AB_PLAN[split].map(x=>EXERCISE_LIBRARY.find(e=>e.id===x.id)).filter(Boolean);
 const max=duration<=30?4:duration<=45?5:duration<=60?6:8;
 const pattern=split.startsWith("Push")?["Chest","Chest","Shoulders","Triceps","Triceps","Shoulders","Chest","Triceps"]:
  split.startsWith("Pull")?["Back","Back","Biceps","Back","Biceps","Back","Biceps","Back"]:
  split.startsWith("Legs")?["Legs","Legs","Calves","Legs","Core","Calves","Legs","Core"]:
  split.startsWith("Upper")?["Chest","Back","Shoulders","Chest","Back","Biceps","Triceps","Back"]:
  split.startsWith("Lower")?["Legs","Legs","Calves","Core","Legs","Calves","Core","Legs"]:
  ["Chest","Back","Legs","Shoulders","Biceps","Triceps","Core","Calves"];
 const used=new Set(),counts={};
 return pattern.slice(0,max).map(muscle=>{
   const options=EXERCISE_LIBRARY.filter(e=>e.muscle===muscle&&!used.has(e.id)).sort((a,b)=>b.priority-a.priority);
   const offset=(counts[muscle]||0)+(split.endsWith("B")?1:split.endsWith("C")?2:0);
   const pick=options[offset%Math.max(1,options.length)]||options[0];
   if(pick){used.add(pick.id);counts[muscle]=(counts[muscle]||0)+1}
   return pick;
 }).filter(Boolean);
}
function todaySplit(date=activeDate){return db.profile.weeklyTemplate?.[new Date(date+"T12:00:00").getDay()]||"Recovery"}
function ensureWorkout(){
 const d=activeDate;if(!db.workouts[d]){
   const split=todaySplit(d), plan=FOUR_DAY_AB_PLAN[split];
   db.workouts[d]={split,startedAt:new Date().toISOString(),duration:db.profile.duration,exercises:split==="Recovery"?[]:(plan||recommendExercises(split,db.profile.duration).map(e=>({id:e.id,sets:3}))).map(item=>({exerciseId:item.id,sets:Array.from({length:item.sets},()=>({reps:"",weight:"",done:false}))})),cardioMinutes:0,cardioDistance:0,cardioCalories:0,liftingCalories:0,finished:false};
 }
 return db.workouts[d];
}
function renderAll(){
 document.getElementById("todaySmall").textContent=datePretty().toUpperCase();
 renderEditDateBanners();
 renderDashboard();renderNutrition();renderTraining();renderSteps();renderProgress();
}
function renderEditDateBanners(){
 ["nutritionEditDate","trainingEditDate"].forEach(id=>{
   const el=document.getElementById(id),past=activeDate!==today();
   el.classList.toggle("hidden",!past);
   if(past)el.innerHTML=`<span>Editing ${datePretty(activeDate)}</span><button onclick="returnToToday()">Return to today</button>`;
 });
}
window.returnToToday=()=>{activeDate=today();renderAll();toast("Back to today")}

function renderDashboard(){
 const dashboardDate=today(),t=dynamicTargets(dashboardDate),totals=mealTotals(dashboardDate),w=currentWeightKg(),tw=db.profile.targetWeightKg;
 document.getElementById("helloTitle").textContent=db.profile.goal==="Lose fat"?"Cut smart.":db.profile.goal==="Gain muscle"?"Build smart.":"Stay consistent.";
 document.getElementById("heroSub").textContent=`${round(displayWeight(w),1)} ${db.profile.weightUnit} → ${round(displayWeight(tw),1)} ${db.profile.weightUnit}`;
 const workout=db.workouts[dashboardDate],n=todayNutrition(dashboardDate),split=todaySplit(dashboardDate);
 const target=stepTarget(),stepProgress=Math.min(1,Number(db.steps[dashboardDate]||0)/target);
 const score=Math.round(((totals.p>=t.protein*.9?1:0)+(totals.kcal>=t.kcal*.9&&totals.kcal<=t.kcal*1.1?1:0)+(workout?.finished?1:split==="Recovery"?1:0)+(n.water>=waterTarget(dashboardDate)?1:0)+stepProgress)/5*100);
 document.getElementById("dayScore").textContent=score+"%";
 document.getElementById("dashboardMetrics").innerHTML=metric("Calories",`${Math.round(totals.kcal)} / ${t.kcal}`)+metric("Protein",`${Math.round(totals.p)} / ${t.protein}g`)+metric("Workout",workout?.finished?"Done":split)+metric("Steps",`${Number(db.steps[dashboardDate]||0).toLocaleString()} / ${target.toLocaleString()}`);
 renderSevenDayHistory();
 renderWeightSpark();
 document.getElementById("todaySplitPill").textContent=split;
 const rec=split==="Recovery"?[]:recommendExercises(split,db.profile.duration);
 document.getElementById("todayPlanPreview").innerHTML=split==="Recovery"?`<p class="muted">No lifting scheduled. Walk, recover, and hit your nutrition.</p>`:rec.map(e=>`<div class="plan-row"><span>${e.name}</span><span class="muted impact-summary">${muscleImpact(e).slice(0,2).map(x=>`${x.name} ${x.pct}%`).join(" · ")}</span></div>`).join("");
 document.getElementById("progressSummary").innerHTML=`<div class="plan-row"><span>Goal</span><strong>${db.profile.goal}</strong></div><div class="plan-row"><span>Target physique</span><strong>${db.profile.bodyType}</strong></div><div class="plan-row"><span>Target weight</span><strong>${round(displayWeight(db.profile.targetWeightKg),1)} ${db.profile.weightUnit}</strong></div>`;
}
function metric(label,value){return `<div class="metric"><div class="label">${label}</div><div class="value">${value}</div></div>`}
function dateShift(date,days){const d=new Date(date+"T12:00:00");d.setDate(d.getDate()+days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function trailingDates(count,end=today()){return Array.from({length:count},(_,i)=>dateShift(end,i-(count-1)))}
function lastSevenDates(){return trailingDates(7)}
function stepTarget(){return Math.max(1000,Number(db.profile.stepTarget)||defaultStepTarget(db.profile.activity))}
function mean(values){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0}
function loggedSteps(dates){return dates.filter(date=>Object.prototype.hasOwnProperty.call(db.steps,date)).map(date=>Number(db.steps[date])||0)}
function weightValues(dates){return dates.filter(date=>db.weights[date]!=null).map(date=>Number(db.weights[date]))}
function currentStepStreak(target){
 let date=today();
 if(!Object.prototype.hasOwnProperty.call(db.steps,date))date=dateShift(date,-1);
 let streak=0;
 while(Number(db.steps[date])>=target){streak++;date=dateShift(date,-1)}
 return streak;
}
function stepAnalytics(){
 const target=stepTarget(),dates7=trailingDates(7),dates14=trailingDates(14),dates30=trailingDates(30),previous7=trailingDates(7,dateShift(today(),-7));
 const values7=loggedSteps(dates7),values30=loggedSteps(dates30),previousValues=loggedSteps(previous7);
 const hits7=dates7.filter(date=>Number(db.steps[date])>=target).length;
 const entries=Object.entries(db.steps).filter(([,value])=>Number(value)>=0);
 const record=entries.length?Math.max(...entries.map(([,value])=>Number(value)||0)):0;
 const avg7=Math.round(mean(values7)),avg30=Math.round(mean(values30)),previousAvg=Math.round(mean(previousValues));
 const trend=values7.length>=4&&previousValues.length>=4&&previousAvg?Math.round((avg7-previousAvg)/previousAvg*100):null;
 const strideM=Number(db.profile.heightCm||170)*(db.profile.sex==="Female"?.413:.415)/100;
 const todaySteps=Number(db.steps[today()]||0),distanceKm=todaySteps*strideM/1000,walkingKcal=Math.round(distanceKm*weightAt(today())*.5);
 return {target,dates7,dates14,dates30,previous7,values7,values30,previousValues,hits7,record,avg7,avg30,previousAvg,trend,strideM,todaySteps,distanceKm,walkingKcal,streak:currentStepStreak(target)};
}
function stepInsight(stats){
 if(stats.values7.length<4)return {title:"Build a reliable baseline",text:`Log at least 4 of the next 7 days. Once FitOS has enough entries, it can compare your movement with weight and nutrition trends instead of guessing.`};
 const currentWeights=weightValues(stats.dates7),previousWeights=weightValues(stats.previous7),weightDelta=currentWeights.length>=3&&previousWeights.length>=3?mean(currentWeights)-mean(previousWeights):null;
 if(db.profile.goal==="Lose fat"&&weightDelta!==null&&weightDelta>-0.15&&stats.trend!==null&&stats.trend<=-10)return {title:"Restore movement before cutting food",text:`Your step average is down ${Math.abs(stats.trend)}% while the weight trend is not falling clearly. Bring activity back toward ${stats.target.toLocaleString()} steps before reducing calories.`};
 if(stats.avg7<stats.target*.8){const increase=Math.min(1000,Math.max(500,Math.round((stats.target-stats.avg7)/500)*500));return {title:"Raise the floor gradually",text:`Your 7-day average is ${stats.avg7.toLocaleString()}. Aim for about ${increase.toLocaleString()} more steps per day next week instead of forcing the full target immediately.`};}
 if(stats.hits7>=6)return {title:"Target is under control",text:`You reached your target on ${stats.hits7} of the last 7 days. Maintain this level; only raise the target if recovery, training performance, and hunger remain stable.`};
 if(stats.trend!==null&&stats.trend>=10)return {title:"Activity is trending up",text:`Your 7-day step average increased ${stats.trend}% from the previous week. Hold this level long enough to make it repeatable before adding more.`};
 return {title:"Close the consistency gap",text:`Your average is ${stats.avg7.toLocaleString()} steps with ${stats.hits7}/7 target days. Focus on making the remaining low days more active rather than pushing your best day higher.`};
}
function renderSteps(){
 const stats=stepAnalytics(),pct=Math.round(stats.todaySteps/stats.target*100),visualPct=Math.min(100,pct),insight=stepInsight(stats);
 document.getElementById("stepsTodayValue").textContent=stats.todaySteps.toLocaleString();
 document.getElementById("stepsTargetValue").textContent=stats.target.toLocaleString();
 document.getElementById("stepPercent").textContent=pct+"%";
 document.getElementById("stepRing").style.setProperty("--step-pct",`${visualPct*3.6}deg`);
 document.getElementById("stepProgressBar").style.width=visualPct+"%";
 document.getElementById("stepsTodayInput").value=Object.prototype.hasOwnProperty.call(db.steps,today())?stats.todaySteps:"";
 document.getElementById("stepsTargetInput").value=stats.target;
 const remaining=Math.max(0,stats.target-stats.todaySteps);
 document.getElementById("stepStatus").textContent=!Object.prototype.hasOwnProperty.call(db.steps,today())?"Check Apple Health and log your steps when you're ready.":remaining?`${remaining.toLocaleString()} steps remaining today.`:`Target reached${stats.todaySteps>stats.target?` by ${(stats.todaySteps-stats.target).toLocaleString()} steps`:""}.`;
 const distance=db.profile.weightUnit==="lb"?`${round(stats.distanceKm*.621371,1)} mi`:`${round(stats.distanceKm,1)} km`;
 document.getElementById("stepMetrics").innerHTML=metric(`7-day avg (${stats.values7.length} logged)`,stats.values7.length?stats.avg7.toLocaleString():"—")+metric(`30-day avg (${stats.values30.length} logged)`,stats.values30.length?stats.avg30.toLocaleString():"—")+metric("Weekly adherence",`${stats.hits7}/7 days`)+metric("Current streak",`${stats.streak} day${stats.streak===1?"":"s"}`)+metric("Personal record",stats.record?stats.record.toLocaleString():"—")+metric("Today's estimate",`${distance} · ${stats.walkingKcal} kcal`);
 const chartMax=Math.max(stats.target,...stats.dates14.map(date=>Number(db.steps[date])||0),1);
 document.getElementById("stepChart").innerHTML=stats.dates14.map(date=>{const value=Number(db.steps[date])||0,logged=Object.prototype.hasOwnProperty.call(db.steps,date),height=logged?Math.max(3,value/chartMax*100):2,d=new Date(date+"T12:00:00");return `<div class="step-bar-wrap ${date===today()?"today":""}" title="${date}: ${logged?value.toLocaleString():"not logged"}"><div class="step-bar ${value>=stats.target?"hit":""}" style="height:${height}%"></div><small>${d.toLocaleDateString(undefined,{weekday:"narrow"})}</small></div>`}).join("");
 document.getElementById("stepTrendLabel").textContent=stats.trend===null?"Log 4+ days in both weeks to unlock comparison.":`${stats.trend>=0?"+":""}${stats.trend}% versus the previous 7-day average.`;
 document.getElementById("stepLoggedLabel").textContent=`${loggedSteps(stats.dates14).length}/14 logged`;
 document.getElementById("stepInsightTitle").textContent=insight.title;document.getElementById("stepInsightText").textContent=insight.text;
 document.getElementById("stepHistoryList").innerHTML=stats.dates14.slice().reverse().map(date=>{const logged=Object.prototype.hasOwnProperty.call(db.steps,date),value=Number(db.steps[date])||0,hit=value>=stats.target;return `<button class="step-history-row" onclick="openStepEditor('${date}')"><span><strong>${datePretty(date)}</strong><small>${logged?`${Math.round(value/stats.target*100)}% of target`:"Not logged"}</small></span><strong>${logged?value.toLocaleString():"—"}</strong><span class="${logged?(hit?"step-hit":"step-miss"):"muted"}">${logged?(hit?"Reached":"Below"):"Add"}</span></button>`}).join("");
}
document.getElementById("saveTodayStepsBtn").onclick=()=>{const value=Number(document.getElementById("stepsTodayInput").value);if(value<0||!Number.isFinite(value))return toast("Enter valid steps");db.steps[today()]=Math.round(value);saveDB();renderAll();toast("Steps saved")}
document.getElementById("saveStepTargetBtn").onclick=()=>{const value=Math.round(Number(document.getElementById("stepsTargetInput").value));if(value<1000||value>50000)return toast("Choose a target from 1,000 to 50,000");db.profile.stepTarget=value;saveDB();renderAll();toast("Step target saved")}
window.openStepEditor=date=>{const value=Object.prototype.hasOwnProperty.call(db.steps,date)?db.steps[date]:"";openModal(`<div class="row-between"><div><div class="eyebrow">EDIT STEPS</div><h3>${datePretty(date)}</h3></div><button class="icon-btn" onclick="closeModal()">✕</button></div><label>Steps<input id="stepEditValue" type="number" min="0" inputmode="numeric" value="${value}"></label><button class="primary" onclick="saveStepEntry('${date}')">Save entry</button>`)}
window.saveStepEntry=date=>{const input=document.getElementById("stepEditValue"),raw=input.value.trim();if(raw==="")delete db.steps[date];else{const value=Number(raw);if(value<0||!Number.isFinite(value))return toast("Enter valid steps");db.steps[date]=Math.round(value)}saveDB();closeModal();renderAll();toast("Step entry updated")}
function renderSevenDayHistory(){
 const box=document.getElementById("sevenDayHistory");if(!box)return;
 box.innerHTML=lastSevenDates().map(date=>{
   const totals=mealTotals(date),workout=db.workouts[date],weight=db.weights[date],steps=db.steps[date]||0;
   const d=new Date(date+"T12:00:00");
   return `<button class="history-day ${date===today()?"today":""}" onclick="openDayEditor('${date}')">
    <span>${d.toLocaleDateString(undefined,{weekday:"short"})}</span><strong>${d.getDate()}</strong>
    <small>${weight?round(displayWeight(weight),1)+db.profile.weightUnit:"—"}</small>
    <small>${steps?Number(steps).toLocaleString()+" steps":"No steps"}</small>
    <small>${Math.round(totals.kcal)} kcal${workout?.finished?" • done":""}</small>
   </button>`;
 }).join("");
}
window.openDayEditor=date=>{
 const n=db.nutrition[date]||{water:0,items:[]},totals=mealTotals(date),w=db.workouts[date];
 openModal(`<div class="row-between"><div><div class="eyebrow">EDIT DAY</div><h3>${datePretty(date)}</h3></div><button class="icon-btn" onclick="closeModal()">✕</button></div>
 <div class="form-grid-2"><label>Weight (${db.profile.weightUnit})<input id="historyWeight" type="number" step=".1" value="${db.weights[date]?round(displayWeight(db.weights[date]),1):""}"></label>
 <label>Steps<input id="historySteps" type="number" inputmode="numeric" value="${db.steps[date]||""}"></label></div>
 <div class="metric-grid" style="margin:12px 0">${metric("Calories",Math.round(totals.kcal))}${metric("Foods",n.items.length)}${metric("Workout",w?.finished?"Done":w?"Draft":"None")}${metric("Water",(n.water||0)+" ml")}</div>
 <button class="primary" onclick="saveDayBasics('${date}')">Save weight & steps</button>
 <div class="backup-grid" style="margin-top:10px"><button class="secondary" onclick="editDayView('${date}','nutritionView')">Edit meals</button><button class="secondary" onclick="editDayView('${date}','trainingView')">Edit workout</button></div>`)
}
window.saveDayBasics=date=>{
 const weight=Number(document.getElementById("historyWeight").value),steps=Number(document.getElementById("historySteps").value);
 if(weight)db.weights[date]=kgFrom(weight,db.profile.weightUnit);else delete db.weights[date];
 if(steps>=0)db.steps[date]=steps;
 saveDB();closeModal();renderAll();toast("Day updated");
}
window.editDayView=(date,viewId)=>{
 activeDate=date;closeModal();renderAll();
 document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===viewId));
 document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id===viewId));
 toast(`Editing ${datePretty(date)}`);
}
function renderWeightSpark(){
 const entries=Object.entries(db.weights).sort(([a],[b])=>a.localeCompare(b)).slice(-14);
 const box=document.getElementById("weightSpark");if(entries.length<2){box.innerHTML=`<div class="muted tiny">Log a few days to see your trend.</div>`;return}
 const vals=entries.map(x=>x[1]),min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;
 box.innerHTML=vals.map(v=>`<i style="height:${20+(v-min)/range*70}%"></i>`).join("");
 const diff=vals[vals.length-1]-vals[0];document.getElementById("weightTrendText").textContent=`${diff>=0?"+":""}${round(displayWeight(diff),1)} ${db.profile.weightUnit}`;
}
function waterTarget(date=activeDate){return Math.round(weightAt(date)*35/250)*250}


function recipeTotals(recipe){
 return (recipe.ingredients||[]).reduce((a,it)=>{
   const f=getFoodById(it.foodId); if(!f)return a;
   const ratio=foodRatio(f,it.amount);
   a.kcal+=Number(f.calories_kcal||0)*ratio;
   a.p+=Number(f.protein_g||0)*ratio;
   a.c+=Number(f.carbs_g||0)*ratio;
   a.f+=Number(f.fat_g||0)*ratio;
   return a;
 },{kcal:0,p:0,c:0,f:0});
}
function openRecipes(){
 openModal(`<div class="row-between"><h3>Saved recipes</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
 <button class="primary" style="margin-bottom:12px" onclick="startRecipeBuilder()">Create recipe</button>
 <div id="recipeList"></div>`);
 renderRecipeList();
}
function renderRecipeList(){
 const box=document.getElementById("recipeList"); if(!box)return;
 if(!db.recipes.length){box.innerHTML='<div class="muted tiny">No recipes yet. Build your shake once, then log it in one tap.</div>';return}
 box.innerHTML=db.recipes.map(r=>{
   const t=recipeTotals(r);
   return `<div class="search-item"><span><strong>${r.name}</strong><small>${Math.round(t.kcal)} kcal • P ${Math.round(t.p)} • C ${Math.round(t.c)} • F ${Math.round(t.f)}</small></span>
   <span style="display:flex;gap:6px"><button class="icon-btn" onclick="chooseRecipeMeal('${r.id}')">＋</button><button class="icon-btn" onclick="deleteRecipe('${r.id}')">✕</button></span></div>`
 }).join("");
}
let recipeDraft=null;
function startRecipeBuilder(){
 recipeDraft={name:"",ingredients:[]};
 openModal(`<div class="row-between"><h3>Create recipe</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
 <label>Recipe name<input id="recipeName" placeholder="Morning Shake"></label>
 <div id="recipeDraftItems" style="margin:12px 0"></div>
 <button class="secondary" style="width:100%;margin-bottom:10px" onclick="addIngredientToRecipe()">+ Add ingredient</button>
 <button class="primary" onclick="saveRecipe()">Save recipe</button>`);
 renderRecipeDraft();
}
function renderRecipeDraft(){
 const box=document.getElementById("recipeDraftItems");if(!box)return;
 if(!recipeDraft.ingredients.length){box.innerHTML='<div class="muted tiny">No ingredients yet.</div>';return}
 box.innerHTML=recipeDraft.ingredients.map((it,i)=>{
   const f=getFoodById(it.foodId);
   return `<div class="food-row"><div><strong>${f.name}</strong><div class="food-meta">${foodAmountText(f,it.amount)}</div></div><span></span><button class="icon-btn" onclick="removeRecipeIngredient(${i})">✕</button></div>`
 }).join("");
}
window.addIngredientToRecipe=()=>{
 const savedName=document.getElementById("recipeName")?.value||recipeDraft.name;recipeDraft.name=savedName;
 openModal(`<div class="row-between"><h3>Add ingredient</h3><button class="icon-btn" onclick="startRecipeBuilderFromDraft()">←</button></div>
 <input id="recipeFoodSearch" placeholder="Search food"><div id="recipeFoodResults" class="search-results" style="margin-top:10px"></div>`);
 const s=document.getElementById("recipeFoodSearch");const draw=()=>{
   const q=s.value.toLowerCase();
   document.getElementById("recipeFoodResults").innerHTML=[...FOOD_LIBRARY,...db.customFoods].filter(f=>!q||`${f.name} ${f.search_tags||""}`.toLowerCase().includes(q)).slice(0,50).map(f=>`<button class="search-item" onclick="pickRecipeFood('${f.food_id}')"><span><strong>${f.name}</strong><small>${f.calories_kcal} kcal / ${foodBasisText(f)}</small></span><span>＋</span></button>`).join("")
 };s.oninput=draw;draw();
}
window.startRecipeBuilderFromDraft=()=>{
 openModal(`<div class="row-between"><h3>Create recipe</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
 <label>Recipe name<input id="recipeName" value="${recipeDraft.name||""}" placeholder="Morning Shake"></label>
 <div id="recipeDraftItems" style="margin:12px 0"></div>
 <button class="secondary" style="width:100%;margin-bottom:10px" onclick="addIngredientToRecipe()">+ Add ingredient</button>
 <button class="primary" onclick="saveRecipe()">Save recipe</button>`);renderRecipeDraft();
}
window.pickRecipeFood=(foodId)=>{
 const f=getFoodById(foodId);
 openModal(`<div class="row-between"><h3>${f.name}</h3><button class="icon-btn" onclick="startRecipeBuilderFromDraft()">←</button></div>
 <label>${foodMeasure(f).unit==="quantity"?"Quantity":`Amount (${foodMeasure(f).unit})`}<input id="recipeIngredientAmount" type="number" step="${foodMeasure(f).unit==="quantity"?1:.1}" value="${foodDefaultAmount(f)}"></label>
 <button class="primary" onclick="confirmRecipeIngredient('${foodId}')">Add ingredient</button>`)
}
window.confirmRecipeIngredient=(foodId)=>{
 const amount=Number(document.getElementById("recipeIngredientAmount").value);if(!amount)return;
 recipeDraft.ingredients.push({foodId,amount});startRecipeBuilderFromDraft();
}
window.removeRecipeIngredient=i=>{recipeDraft.ingredients.splice(i,1);renderRecipeDraft()}
window.saveRecipe=()=>{
 recipeDraft.name=document.getElementById("recipeName").value.trim();if(!recipeDraft.name||!recipeDraft.ingredients.length)return toast("Add a name and ingredients");
 db.recipes.push({id:"recipe_"+Date.now(),name:recipeDraft.name,ingredients:recipeDraft.ingredients});saveDB();recipeDraft=null;openRecipes();toast("Recipe saved");
}
window.deleteRecipe=id=>{db.recipes=db.recipes.filter(r=>r.id!==id);saveDB();renderRecipeList()}
window.chooseRecipeMeal=id=>{
 const r=db.recipes.find(x=>x.id===id);
 openModal(`<div class="row-between"><h3>${r.name}</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
 <p class="muted">Choose where to log it.</p>
 <div class="search-results">${MEALS.map(m=>`<button class="search-item" onclick="logRecipe('${id}','${m}')"><strong>${m}</strong><span>→</span></button>`).join("")}</div>`)
}
window.logRecipe=(id,meal)=>{
 const r=db.recipes.find(x=>x.id===id),n=todayNutrition();
 r.ingredients.forEach(it=>n.items.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),foodId:it.foodId,meal,amount:it.amount,recipeId:id}));
 saveDB();closeModal();renderNutrition();renderDashboard();toast(`${r.name} logged`);
}

function renderNutrition(){
 const t=dynamicTargets(),tot=mealTotals(),n=todayNutrition();
 document.getElementById("calLeft").textContent=Math.max(0,Math.round(t.kcal-tot.kcal));
 document.getElementById("macroBars").innerHTML=macroBar("Protein",tot.p,t.protein,"g")+macroBar("Carbs",tot.c,t.carbs,"g")+macroBar("Fat",tot.f,t.fat,"g");
 document.getElementById("waterNow").textContent=n.water;document.getElementById("waterTarget").textContent=waterTarget();
 document.getElementById("mealSections").innerHTML=MEALS.map(meal=>{
   const items=n.items.filter(i=>i.meal===meal);
   return `<div class="meal-card"><div class="meal-head"><strong>${meal}</strong><button class="icon-btn" onclick="openFoodModal('${meal}')">＋</button></div>${items.length?items.map(foodRow).join(""):`<div class="muted tiny" style="padding-top:8px">Nothing logged.</div>`}</div>`;
 }).join("");
}
function macroBar(name,v,target,u){const pct=Math.min(100,v/target*100);return `<div class="bar-row"><div class="bar-head"><span>${name}</span><span>${Math.round(v)} / ${target}${u}</span></div><div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div></div>`}
function foodRow(it){
 const f=getFoodById(it.foodId),ratio=foodRatio(f,it.amount),k=Math.round(Number(f.calories_kcal||0)*ratio);
 return `<div class="food-row"><div><strong>${f.name}</strong><div class="food-meta">${foodAmountText(f,it.amount)} • ${k} kcal</div></div><span>${Math.round(Number(f.protein_g||0)*ratio)}g P</span><button class="icon-btn" onclick="deleteFood('${it.id}')">✕</button></div>`
}
document.querySelectorAll("[data-water]").forEach(b=>b.onclick=()=>{todayNutrition().water+=Number(b.dataset.water);saveDB();renderNutrition();renderDashboard()})
document.getElementById("logStepsBtn").onclick=()=>{
 const date=today();
 openModal(`<div class="row-between"><h3>Today's steps</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
 <label>Steps<input id="quickSteps" type="number" inputmode="numeric" value="${db.steps[date]||""}" placeholder="10000"></label>
 <button class="primary" onclick="saveQuickSteps('${date}')">Save steps</button>`)
}
window.saveQuickSteps=date=>{db.steps[date]=Math.max(0,Number(document.getElementById("quickSteps").value)||0);saveDB();closeModal();renderAll();toast("Steps saved")}
window.deleteFood=id=>{const n=todayNutrition();n.items=n.items.filter(i=>i.id!==id);saveDB();renderNutrition();renderDashboard()}

function openModal(html){document.getElementById("modalSheet").innerHTML=html;document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
window.closeModal=closeModal;
document.getElementById("modal").onclick=e=>{if(e.target.id==="modal")closeModal()}
window.openFoodModal=(meal="Breakfast")=>{
 openModal(`<div class="search"><div class="row-between"><h3>Add food</h3><button class="icon-btn" onclick="closeModal()">✕</button></div><input id="foodSearch" placeholder="Search food or brand"></div><div id="foodResults" class="search-results"></div><button class="secondary" style="width:100%;margin-top:10px" onclick="openCustomFood('${meal}')">Create custom food</button>`);
 const s=document.getElementById("foodSearch");s.oninput=()=>renderFoodResults(s.value,meal);renderFoodResults("",meal);
}
document.getElementById("openFoodAdd").onclick=()=>openFoodModal("Breakfast");
document.getElementById("openRecipesBtn").onclick=openRecipes;
function renderFoodResults(q,meal){
 const qq=q.toLowerCase().trim();
 const all=[...FOOD_LIBRARY,...db.customFoods];
 const list=all.filter(f=>!qq||`${f.name} ${f.search_tags||""} ${f.brand||""}`.toLowerCase().includes(qq))
   .sort((a,b)=>{
     if(!qq)return 0;
     const an=a.name.toLowerCase(),bn=b.name.toLowerCase();
     const ae=an===qq?0:an.startsWith(qq)?1:2;
     const be=bn===qq?0:bn.startsWith(qq)?1:2;
     return ae-be;
   }).slice(0,50);
 document.getElementById("foodResults").innerHTML=list.map(f=>`<button class="search-item" onclick="chooseFood('${f.food_id}','${meal}')"><span><strong>${f.name}</strong><small>${f.category} • ${f.calories_kcal} kcal / ${foodBasisText(f)}</small></span><span>＋</span></button>`).join("");
}
window.chooseFood=(foodId,meal)=>{
 const f=getFoodById(foodId);
 const micros=[
   f.fiber_g!==""?`Fiber ${f.fiber_g}g`:"",
   f.sugar_g!==""?`Sugar ${f.sugar_g}g`:"",
   f.sodium_mg!==""?`Sodium ${f.sodium_mg}mg`:"",
   f.potassium_mg!==""?`Potassium ${f.potassium_mg}mg`:"",
   f.calcium_mg!==""?`Calcium ${f.calcium_mg}mg`:"",
   f.iron_mg!==""?`Iron ${f.iron_mg}mg`:""
 ].filter(Boolean).join(" • ");
 openModal(`<div class="row-between"><h3>${f.name}</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
 <p class="muted">${f.calories_kcal} kcal • P ${f.protein_g} • C ${f.carbs_g} • F ${f.fat_g} per ${foodBasisText(f)}</p>
 ${micros?`<p class="muted tiny">${micros}</p>`:""}
 <p class="muted tiny">${f.nutrition_source||""}</p>
 <label>${foodMeasure(f).unit==="quantity"?"Quantity":`Amount (${foodMeasure(f).unit})`}<input id="foodAmount" type="number" step="${foodMeasure(f).unit==="quantity"?1:.1}" value="${foodDefaultAmount(f)}"></label>
 <button class="primary" onclick="logFood('${foodId}','${meal}')">Add to ${meal}</button>`)
}
window.logFood=(foodId,meal)=>{const amount=Number(document.getElementById("foodAmount").value);if(!amount)return;const t=todayNutrition();t.items.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),foodId,meal,amount});saveDB();closeModal();renderNutrition();renderDashboard();toast("Added")}
window.openCustomFood=(meal)=>{
 openModal(`<div class="row-between"><h3>Custom food</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
 <div class="form-stack"><label>Name<input id="cfName"></label><label>Unit<select id="cfUnit"><option>g</option><option>ml</option><option>quantity</option></select></label><label>Nutrition basis (100 for g/ml, 1 for quantity)<input id="cfBasis" type="number" value="100"></label>
 <label>Calories<input id="cfKcal" type="number"></label><label>Protein g<input id="cfP" type="number" step=".1"></label><label>Carbs g<input id="cfC" type="number" step=".1"></label><label>Fat g<input id="cfF" type="number" step=".1"></label></div>
 <button class="primary" onclick="saveCustomFood('${meal}')">Save & add</button>`);
 const unit=document.getElementById("cfUnit"),basis=document.getElementById("cfBasis");unit.onchange=()=>{basis.value=unit.value==="quantity"?1:100};
}
window.saveCustomFood=(meal)=>{
 const name=document.getElementById("cfName").value.trim();if(!name)return;
 const id="custom_"+Date.now();const f={food_id:id,name,category:"Custom",subcategory:"Custom",default_amount:Number(document.getElementById("cfBasis").value)||100,default_unit:document.getElementById("cfUnit").value,nutrition_basis_amount:Number(document.getElementById("cfBasis").value)||100,nutrition_basis_unit:document.getElementById("cfUnit").value,calories_kcal:Number(document.getElementById("cfKcal").value)||0,protein_g:Number(document.getElementById("cfP").value)||0,carbs_g:Number(document.getElementById("cfC").value)||0,fat_g:Number(document.getElementById("cfF").value)||0,fiber_g:0,is_custom:true};
 db.customFoods.push(f);saveDB();chooseFood(id,meal);
}

function muscleImpact(exercise){
 const name=exercise.name.toLowerCase();
 const impacts=(...items)=>items.map(([label,pct])=>({name:label,pct}));
 if(name.includes("incline")&&name.includes("press"))return impacts(["Upper chest",60],["Front delts",25],["Triceps",15]);
 if((name.includes("bench press")||name.includes("chest press"))&&!name.includes("incline"))return impacts(["Mid chest",60],["Triceps",25],["Front delts",15]);
 if(name.includes("chest fly")||name.includes("pec deck"))return impacts(["Chest",80],["Front delts",15],["Biceps",5]);
 if(name.includes("push-up"))return impacts(["Chest",60],["Triceps",25],["Front delts",15]);
 if(name.includes("lat pulldown")||name.includes("pull-up"))return impacts(["Lats",65],["Biceps",20],["Upper back",15]);
 if(name.includes("straight-arm pulldown"))return impacts(["Lats",80],["Teres major",15],["Triceps long head",5]);
 if(name.includes("row")&&!name.includes("upright"))return impacts(["Mid-back",50],["Lats",30],["Biceps",20]);
 if(name.includes("face pull"))return impacts(["Rear delts",45],["Mid/lower traps",35],["Rotator cuff",20]);
 if(name.includes("back extension"))return impacts(["Spinal erectors",55],["Glutes",30],["Hamstrings",15]);
 if(name.includes("shrug"))return impacts(["Upper traps",85],["Levator scapulae",15]);
 if(name.includes("lateral raise"))return impacts(["Side delts",80],["Upper traps",15],["Supraspinatus",5]);
 if(name.includes("front raise"))return impacts(["Front delts",85],["Upper chest",10],["Side delts",5]);
 if(name.includes("rear delt")||name.includes("reverse pec"))return impacts(["Rear delts",75],["Mid traps",15],["Rotator cuff",10]);
 if(name.includes("shoulder press")||name.includes("overhead press")||name.includes("arnold press"))return impacts(["Front delts",50],["Side delts",30],["Triceps",20]);
 if(name.includes("upright row"))return impacts(["Side delts",50],["Upper traps",35],["Biceps",15]);
 if(name.includes("reverse curl"))return impacts(["Brachialis",45],["Forearms",40],["Biceps",15]);
 if(name.includes("hammer curl"))return impacts(["Brachialis",40],["Brachioradialis",35],["Biceps",25]);
 if(name.includes("curl"))return impacts(["Biceps",75],["Brachialis",20],["Forearms",5]);
 if(name.includes("overhead")&&name.includes("extension"))return impacts(["Triceps long head",70],["Lateral/medial heads",30]);
 if(name.includes("pushdown"))return impacts(["Triceps lateral/medial",75],["Triceps long head",25]);
 if(name.includes("skull")||name.includes("tricep extension"))return impacts(["Triceps long head",55],["Lateral/medial heads",45]);
 if(name.includes("dip")||name.includes("close-grip")||name.includes("diamond"))return impacts(["Triceps",60],["Chest",25],["Front delts",15]);
 if(name.includes("kickback"))return impacts(["Triceps",90],["Rear delts",10]);
 if(name.includes("leg press"))return impacts(["Quads",60],["Glutes",25],["Adductors",15]);
 if(name.includes("leg extension"))return impacts(["Quads",90],["Hip flexors",10]);
 if(name.includes("leg curl"))return impacts(["Hamstrings",90],["Calves",10]);
 if(name.includes("romanian deadlift"))return impacts(["Hamstrings",50],["Glutes",35],["Spinal erectors",15]);
 if(name.includes("hip thrust")||name.includes("glute kickback"))return impacts(["Glutes",75],["Hamstrings",15],["Adductors",10]);
 if(name.includes("squat")||name.includes("lunge")||name.includes("step-up"))return impacts(["Quads",50],["Glutes",35],["Hamstrings",15]);
 if(exercise.muscle==="Calves")return impacts(["Gastrocnemius",70],["Soleus",30]);
 if(name.includes("machine ab")||name.includes("cable crunch")||name.includes("sit-up"))return impacts(["Rectus abs",80],["Obliques",10],["Hip flexors",10]);
 if(name.includes("reverse crunch"))return impacts(["Lower abs",70],["Hip flexors",30]);
 if(name.includes("knee raise")||name.includes("leg raise"))return impacts(["Lower abs",55],["Hip flexors",45]);
 if(name.includes("russian")||name.includes("woodchopper"))return impacts(["Obliques",70],["Rectus abs",20],["Hip flexors",10]);
 if(name.includes("plank")||name.includes("dead bug")||name.includes("ab wheel"))return impacts(["Deep core",55],["Rectus abs",30],["Shoulder stabilizers",15]);
 if(name.includes("bicycle")||name.includes("mountain climber"))return impacts(["Rectus abs",45],["Obliques",35],["Hip flexors",20]);
 const fallback={Chest:["Chest","Triceps","Front delts"],Back:["Back","Biceps","Rear delts"],Shoulders:["Shoulders","Triceps","Upper traps"],Biceps:["Biceps","Brachialis","Forearms"],Triceps:["Triceps","Chest","Front delts"],Legs:["Legs","Glutes","Core"],Calves:["Calves","Tibialis","Core"],Core:["Core","Obliques","Hip flexors"]}[exercise.muscle]||[exercise.muscle,"Stabilizers","Core"];
 return impacts([fallback[0],70],[fallback[1],20],[fallback[2],10]);
}
function muscleImpactMarkup(exercise){
 return `<div class="impact-label">Estimated muscle contribution</div><div class="muscle-impact">${muscleImpact(exercise).map(x=>`<div class="impact-chip"><strong>${x.name}</strong><span>${x.pct}%</span></div>`).join("")}</div>`;
}

function renderTraining(){
 const w=ensureWorkout(),split=w.split;document.getElementById("trainingTitle").textContent=split==="Recovery"?"Recovery day":split;
 const done=w.exercises.reduce((s,e)=>s+e.sets.filter(x=>x.done).length,0),total=w.exercises.reduce((s,e)=>s+e.sets.length,0);
 document.getElementById("trainingSummary").innerHTML=`<div class="mini-chip">${split}</div><div class="mini-chip">${done}/${total} sets</div><div class="mini-chip">${db.profile.duration} min planned</div>`;
 document.getElementById("exerciseCards").innerHTML=w.exercises.length?w.exercises.map((x,i)=>exerciseCard(x,i)).join(""):`<div class="card"><p class="muted">No strength session scheduled today. Add one if you want.</p></div>`;
 document.getElementById("saveWorkoutBtn").style.display=w.exercises.length?"block":"none";
 if(w.cardioMinutes){document.getElementById("cardioResult").textContent=`Saved: ${w.cardioMinutes} min • ${w.cardioDistance||0} ${db.profile.weightUnit==="lb"?"mi":"km"} • ~${w.cardioCalories} kcal`}
}
function lastExercisePerformance(exId){
 const ds=Object.keys(db.workouts).filter(d=>d<activeDate).sort().reverse();for(const d of ds){const e=db.workouts[d]?.exercises?.find(x=>x.exerciseId===exId);if(e)return e}return null
}
function exerciseCard(x,i){
 const e=EXERCISE_LIBRARY.find(z=>z.id===x.exerciseId),prev=lastExercisePerformance(x.exerciseId);
 const prevTxt=prev?prev.sets.filter(s=>s.done).map(s=>`${s.weight||"BW"}×${s.reps}`).join(", "):"No previous session";
 return `<div class="exercise-card"><div class="exercise-title"><div><h3>${e.name}</h3><div class="previous">Last: ${prevTxt}</div></div><button class="icon-btn" aria-label="Replace with another ${e.muscle} exercise" onclick="replaceExercise(${i})">↻</button></div>
 ${muscleImpactMarkup(e)}
 <div class="warmup">Warm-up: 1 light set × 12, then 1 moderate set × 6. Not tracked.</div>
 <div class="set-head"><span>Set</span><span>${e.trackWeight?"Weight":"—"}</span><span>${e.trackReps?"Reps":"Time"}</span><span>Done</span></div>
 ${x.sets.map((s,j)=>setRow(e,s,i,j)).join("")}<button class="add-set" onclick="addSet(${i})">+ Add set</button></div>`
}
function setRow(e,s,i,j){return `<div class="set-row"><span>${j+1}</span><input ${e.trackWeight?"":"disabled"} type="number" step=".1" value="${s.weight}" oninput="editSet(${i},${j},'weight',this.value)" placeholder="${e.trackWeight?"kg/lb":"—"}"><input type="number" value="${s.reps}" oninput="editSet(${i},${j},'reps',this.value)" placeholder="${e.trackReps?"reps":"sec"}"><button class="set-done ${s.done?"done":""}" onclick="toggleSet(${i},${j})">✓</button></div>`}
window.editSet=(i,j,k,v)=>{ensureWorkout().exercises[i].sets[j][k]=v;saveDB()}
window.toggleSet=(i,j)=>{const s=ensureWorkout().exercises[i].sets[j];s.done=!s.done;saveDB();renderTraining()}
window.addSet=i=>{ensureWorkout().exercises[i].sets.push({reps:"",weight:"",done:false});saveDB();renderTraining()}
window.replaceExercise=i=>{
 const w=ensureWorkout(),old=EXERCISE_LIBRARY.find(e=>e.id===w.exercises[i].exerciseId);const opts=EXERCISE_LIBRARY.filter(e=>e.muscle===old.muscle&&e.id!==old.id).sort((a,b)=>b.priority-a.priority).slice(0,12);
 openModal(`<div class="row-between"><h3>Replace ${old.name}</h3><button class="icon-btn" onclick="closeModal()">✕</button></div><p class="muted tiny">Locked to ${old.muscle}: replacements keep the same muscle-group role.</p><div class="search-results">${opts.map(e=>`<button class="search-item" onclick="doReplace(${i},'${e.id}')"><span><strong>${e.name}</strong><small>${e.equipment} • ${muscleImpact(e).slice(0,2).map(x=>`${x.name} ${x.pct}%`).join(" · ")}</small></span><span>→</span></button>`).join("")}</div>`)
}
window.doReplace=(i,id)=>{const w=ensureWorkout(),setCount=w.exercises[i].sets.length;w.exercises[i]={exerciseId:id,sets:Array.from({length:setCount},()=>({reps:"",weight:"",done:false}))};saveDB();closeModal();renderTraining()}
document.getElementById("addExerciseBtn").onclick=()=>{
 const w=ensureWorkout();openModal(`<div class="row-between"><h3>Add exercise</h3><button class="icon-btn" onclick="closeModal()">✕</button></div><input id="exSearch" placeholder="Search exercise"><div id="exResults" class="search-results" style="margin-top:10px"></div>`);
 const s=document.getElementById("exSearch");const render=()=>{const q=s.value.toLowerCase();document.getElementById("exResults").innerHTML=EXERCISE_LIBRARY.filter(e=>!q||`${e.name} ${e.muscle}`.toLowerCase().includes(q)).slice(0,40).map(e=>`<button class="search-item" onclick="addExercise('${e.id}')"><span><strong>${e.name}</strong><small>${e.muscle}</small></span><span>＋</span></button>`).join("")};s.oninput=render;render();
}
window.addExercise=id=>{ensureWorkout().exercises.push({exerciseId:id,sets:[{reps:"",weight:"",done:false},{reps:"",weight:"",done:false},{reps:"",weight:"",done:false}]});saveDB();closeModal();renderTraining()}
document.getElementById("saveCardioBtn").onclick=()=>{
 const w=ensureWorkout(),mins=Number(document.getElementById("cardioMinutes").value)||0,dist=Number(document.getElementById("cardioDistance").value)||0;
 w.cardioMinutes=mins;w.cardioDistance=dist;
 // simple MET estimate, clearly approximate
 const met=document.getElementById("cardioType").value==="Walking"?3.8:5.0;w.cardioCalories=Math.round(met*weightAt(activeDate)*(mins/60));
 saveDB();renderTraining();renderNutrition();renderDashboard();toast("Cardio saved");
}
document.getElementById("saveWorkoutBtn").onclick=()=>{
 const w=ensureWorkout();w.finished=true;
 // estimated strength training expenditure using moderate MET 5.0
 w.liftingCalories=Math.round(5.0*weightAt(activeDate)*(db.profile.duration/60));
 // PR detection
 const prs=[];
 w.exercises.forEach(ex=>{
   const hist=Object.entries(db.workouts).filter(([d])=>d<activeDate).flatMap(([,wo])=>wo.exercises||[]).filter(x=>x.exerciseId===ex.exerciseId);
   const oldMax=Math.max(0,...hist.flatMap(x=>x.sets.filter(s=>s.done).map(s=>Number(s.weight)||0)));
   const newMax=Math.max(0,...ex.sets.filter(s=>s.done).map(s=>Number(s.weight)||0));
   if(newMax>oldMax&&newMax>0)prs.push(EXERCISE_LIBRARY.find(e=>e.id===ex.exerciseId).name);
 });w.prs=prs;saveDB();renderAll();toast(prs.length?`PR: ${prs[0]}${prs.length>1?" + more":""}`:"Workout saved");
}

function renderProgress(){
 const weights=Object.entries(db.weights).sort(([a],[b])=>a.localeCompare(b));const start=db.profile.startWeightKg,now=currentWeightKg();
 const diff=now-start,workouts=Object.values(db.workouts).filter(w=>w.finished).length,prs=Object.values(db.workouts).reduce((s,w)=>s+(w.prs?.length||0),0);
 document.getElementById("progressMetrics").innerHTML=metric("Weight change",`${diff>=0?"+":""}${round(displayWeight(diff),1)} ${db.profile.weightUnit}`)+metric("Workouts",workouts)+metric("PRs",prs)+metric("Target",`${round(displayWeight(db.profile.targetWeightKg),1)} ${db.profile.weightUnit}`);
 const day=new Date(db.profile.createdAt+"T12:00:00").getDate();const nowd=new Date();const due=new Date(nowd.getFullYear(),nowd.getMonth(),day);if(due<nowd)due.setMonth(due.getMonth()+1);
 document.getElementById("measureDue").textContent=`Next: ${due.toLocaleDateString(undefined,{month:"short",day:"numeric"})}`;
}
document.getElementById("saveMeasurementsBtn").onclick=()=>{
 const d=today();db.measurements[d]={waist:Number(mWaist.value)||null,chest:Number(mChest.value)||null,hips:Number(mHips.value)||null,arm:Number(mArm.value)||null,thigh:Number(mThigh.value)||null};saveDB();toast("Measurements saved")
}

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{if(b.dataset.view==="dashboardView"&&activeDate!==today()){activeDate=today();renderAll()}document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.getElementById(b.dataset.view).classList.add("active");if(b.dataset.view==="progressView")renderProgress()})

document.getElementById("profileBtn").onclick=()=>{
 const t=calcTargets(db.profile,currentWeightKg());openModal(`<div class="row-between"><h3>Your setup</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
 <div class="metric-grid">${metric("Goal",db.profile.goal)}${metric("Body type",db.profile.bodyType)}${metric("Base calories",t.kcal)}${metric("Protein",t.protein+"g")}</div>
 <p class="muted tiny">Targets are reviewed from your weight trend. Daily scale noise does not automatically change them.</p>
 <button class="secondary" style="width:100%" onclick="resetApp()">Reset app</button>`)
}
window.resetApp=()=>{if(confirm("Erase all FitOS data on this phone?")){localStorage.removeItem(DB_KEY);location.reload()}}

document.getElementById("exportBackupBtn").onclick=()=>{
 const blob=new Blob([JSON.stringify({app:"FitOS",version:1,exportedAt:new Date().toISOString(),data:db},null,2)],{type:"application/json"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=`FitOS-backup-${today()}.json`;a.click();URL.revokeObjectURL(u);db.lastBackup=new Date().toISOString();saveDB();document.getElementById("backupStatus").textContent="Backup exported just now.";
}
document.getElementById("importBackup").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const p=JSON.parse(await f.text()),d=p.data||p;if(!d.profile||!d.weights)throw 0;if(!confirm("Replace current FitOS data with this backup?"))return;db=d;saveDB();location.reload()}catch{toast("Invalid backup")}}

start();


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

let db=loadDB();
let onboarding={step:0,sex:"",age:"",heightUnit:"cm",heightCm:"",heightFt:"",heightIn:"",weightUnit:"kg",weight:"",activity:"",targetWeight:"",bodyType:"",goal:"",days:4,duration:60};

function blankDB(){
 return {profile:null,weights:{},skips:{},nutrition:{},workouts:{},measurements:{},settings:{exerciseCalorieCredit:.5},customFoods:[],recipes:[],savedMeals:[],lastBackup:null};
}
function loadDB(){
 try{
   const x=JSON.parse(localStorage.getItem(DB_KEY))||blankDB();
   if(!x.recipes)x.recipes=[];
   if(!x.customFoods)x.customFoods=[];
   if(!x.settings)x.settings={exerciseCalorieCredit:.5};
   return x;
 }catch{return blankDB()}
}
function saveDB(){localStorage.setItem(DB_KEY,JSON.stringify(db))}
function today(){
 const forced=localStorage.getItem("fitos_test_date");
 if(forced)return forced;
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
function todayNutrition(){
 const d=today();if(!db.nutrition[d])db.nutrition[d]={water:0,items:[]};return db.nutrition[d];
}
function getFoodById(id){return [...FOOD_LIBRARY,...db.customFoods].find(f=>f.food_id===id)}
function mealTotals(date=today()){
 const n=db.nutrition[date]||{items:[]}; return n.items.reduce((a,it)=>{
   const f=getFoodById(it.foodId); if(!f)return a;
   const ratio=it.amount/Number(f.nutrition_basis_amount||100);
   a.kcal+=Number(f.calories_kcal||0)*ratio;a.p+=Number(f.protein_g||0)*ratio;a.c+=Number(f.carbs_g||0)*ratio;a.f+=Number(f.fat_g||0)*ratio;a.fiber+=Number(f.fiber_g||0)*ratio;return a;
 },{kcal:0,p:0,c:0,f:0,fiber:0});
}
function todayExerciseCredit(){
 const w=db.workouts[today()]; if(!w)return 0;
 return Math.round((Number(w.cardioCalories||0)+Number(w.liftingCalories||0))*(db.settings.exerciseCalorieCredit??.5));
}
function dynamicTargets(){
 const base=calcTargets(db.profile,currentWeightKg()); return {...base,kcal:base.kcal+todayExerciseCredit()};
}

function start(){
 if(!db.profile){show("onboarding");renderOnboarding();return}
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
function previewProfile(){return {sex:onboarding.sex,age:Number(onboarding.age),heightCm:calcHeightCm(onboarding),weightUnit:onboarding.weightUnit,startWeightKg:kgFrom(onboarding.weight,onboarding.weightUnit),activity:onboarding.activity,targetWeightKg:kgFrom(onboarding.targetWeight,onboarding.weightUnit),bodyType:onboarding.bodyType,goal:onboarding.goal,days:Number(onboarding.days),duration:Number(onboarding.duration),createdAt:today()}}
function safePace(goal){return goal==="Lose fat"?"About 0.5–0.75% body weight/week":goal==="Gain muscle"?"Slow gain: roughly 0.1–0.25%/week":goal==="Recomp"?"Scale may move slowly; strength and waist matter more":"Hold roughly steady"}
function splitName(days){return days===3?"Full Body":days===4?"Upper / Lower":days===5?"PPL + Upper / Lower":"Push / Pull / Legs"}
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
 db.profile.weeklyTemplate={}; const splits=SPLITS[db.profile.days]; const weekdays=[1,2,3,4,5,6,0]; // Mon-Sun
 const chosen=weekdays.slice(0,db.profile.days); chosen.forEach((day,i)=>db.profile.weeklyTemplate[day]=splits[i]);
}
function splitMuscles(split){
 if(split.startsWith("Push"))return ["Chest","Shoulders","Triceps"];
 if(split.startsWith("Pull"))return ["Back","Biceps"];
 if(split.startsWith("Legs")||split.startsWith("Lower"))return ["Legs","Calves","Core"];
 if(split.startsWith("Upper"))return ["Chest","Back","Shoulders","Biceps","Triceps"];
 return ["Chest","Back","Legs","Shoulders","Biceps","Triceps","Core"];
}
function recommendExercises(split,duration){
 const muscles=splitMuscles(split), max=duration<=30?4:duration<=45?5:duration<=60?6:8;
 let picks=[];
 muscles.forEach(m=>{
   const opts=EXERCISE_LIBRARY.filter(e=>e.muscle===m).sort((a,b)=>b.priority-a.priority);
   if(opts[0])picks.push(opts[0]);
 });
 let pool=EXERCISE_LIBRARY.filter(e=>muscles.includes(e.muscle)&&!picks.some(p=>p.id===e.id)).sort((a,b)=>b.priority-a.priority);
 while(picks.length<max&&pool.length)picks.push(pool.shift());
 return picks.slice(0,max);
}
function todaySplit(){return db.profile.weeklyTemplate?.[new Date().getDay()]||"Recovery"}
function ensureWorkout(){
 const d=today();if(!db.workouts[d]){
   const split=todaySplit(); db.workouts[d]={split,startedAt:new Date().toISOString(),duration:db.profile.duration,exercises:split==="Recovery"?[]:recommendExercises(split,db.profile.duration).map(e=>({exerciseId:e.id,sets:[{reps:"",weight:"",done:false},{reps:"",weight:"",done:false},{reps:"",weight:"",done:false}]})),cardioMinutes:0,cardioDistance:0,cardioCalories:0,liftingCalories:0,finished:false};
 }
 return db.workouts[d];
}
function renderAll(){
 document.getElementById("todaySmall").textContent=datePretty().toUpperCase();
 renderDashboard();renderNutrition();renderTraining();renderProgress();
}

function renderDashboard(){
 const t=dynamicTargets(), totals=mealTotals(), w=currentWeightKg(), tw=db.profile.targetWeightKg;
 document.getElementById("helloTitle").textContent=db.profile.goal==="Lose fat"?"Cut smart.":db.profile.goal==="Gain muscle"?"Build smart.":"Stay consistent.";
 document.getElementById("heroSub").textContent=`${round(displayWeight(w),1)} ${db.profile.weightUnit} → ${round(displayWeight(tw),1)} ${db.profile.weightUnit}`;
 const workout=db.workouts[today()]; const n=todayNutrition();
 const score=Math.round(((totals.p>=t.protein*.9?1:0)+(totals.kcal>=t.kcal*.9&&totals.kcal<=t.kcal*1.1?1:0)+(workout?.finished?1:todaySplit()==="Recovery"?1:0)+(n.water>=waterTarget()?1:0))/4*100);
 document.getElementById("dayScore").textContent=score+"%";
 document.getElementById("dashboardMetrics").innerHTML=metric("Calories",`${Math.round(totals.kcal)} / ${t.kcal}`)+metric("Protein",`${Math.round(totals.p)} / ${t.protein}g`)+metric("Workout",workout?.finished?"Done":todaySplit())+metric("Maintenance",t.maintenance+" kcal");
 renderWeightSpark();
 const split=todaySplit();document.getElementById("todaySplitPill").textContent=split;
 const rec=split==="Recovery"?[]:recommendExercises(split,db.profile.duration);
 document.getElementById("todayPlanPreview").innerHTML=split==="Recovery"?`<p class="muted">No lifting scheduled. Walk, recover, and hit your nutrition.</p>`:rec.slice(0,5).map(e=>`<div class="plan-row"><span>${e.name}</span><span class="muted">${e.muscle}</span></div>`).join("");
 const targetDiff=round(displayWeight(currentWeightKg()-db.profile.targetWeightKg),1);
 document.getElementById("progressSummary").innerHTML=`<div class="plan-row"><span>Goal</span><strong>${db.profile.goal}</strong></div><div class="plan-row"><span>Target physique</span><strong>${db.profile.bodyType}</strong></div><div class="plan-row"><span>Target weight</span><strong>${round(displayWeight(db.profile.targetWeightKg),1)} ${db.profile.weightUnit}</strong></div>`;
}
function metric(label,value){return `<div class="metric"><div class="label">${label}</div><div class="value">${value}</div></div>`}
function renderWeightSpark(){
 const entries=Object.entries(db.weights).sort(([a],[b])=>a.localeCompare(b)).slice(-14);
 const box=document.getElementById("weightSpark");if(entries.length<2){box.innerHTML=`<div class="muted tiny">Log a few days to see your trend.</div>`;return}
 const vals=entries.map(x=>x[1]),min=Math.min(...vals),max=Math.max(...vals),range=max-min||1;
 box.innerHTML=vals.map(v=>`<i style="height:${20+(v-min)/range*70}%"></i>`).join("");
 const diff=vals[vals.length-1]-vals[0];document.getElementById("weightTrendText").textContent=`${diff>=0?"+":""}${round(displayWeight(diff),1)} ${db.profile.weightUnit}`;
}
function waterTarget(){return Math.round(currentWeightKg()*35/250)*250}


function recipeTotals(recipe){
 return (recipe.ingredients||[]).reduce((a,it)=>{
   const f=getFoodById(it.foodId); if(!f)return a;
   const ratio=Number(it.amount)/Number(f.nutrition_basis_amount||100);
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
   return `<div class="food-row"><div><strong>${f.name}</strong><div class="food-meta">${it.amount}${f.default_unit}</div></div><span></span><button class="icon-btn" onclick="removeRecipeIngredient(${i})">✕</button></div>`
 }).join("");
}
window.addIngredientToRecipe=()=>{
 const savedName=document.getElementById("recipeName")?.value||recipeDraft.name;recipeDraft.name=savedName;
 openModal(`<div class="row-between"><h3>Add ingredient</h3><button class="icon-btn" onclick="startRecipeBuilderFromDraft()">←</button></div>
 <input id="recipeFoodSearch" placeholder="Search food"><div id="recipeFoodResults" class="search-results" style="margin-top:10px"></div>`);
 const s=document.getElementById("recipeFoodSearch");const draw=()=>{
   const q=s.value.toLowerCase();
   document.getElementById("recipeFoodResults").innerHTML=[...FOOD_LIBRARY,...db.customFoods].filter(f=>!q||`${f.name} ${f.search_tags||""}`.toLowerCase().includes(q)).slice(0,50).map(f=>`<button class="search-item" onclick="pickRecipeFood('${f.food_id}')"><span><strong>${f.name}</strong><small>${f.calories_kcal} kcal / ${f.nutrition_basis_amount}${f.default_unit}</small></span><span>＋</span></button>`).join("")
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
 <label>Amount (${f.default_unit})<input id="recipeIngredientAmount" type="number" step=".1" value="${f.default_amount||100}"></label>
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
 const f=getFoodById(it.foodId),ratio=it.amount/Number(f.nutrition_basis_amount||100),k=Math.round(Number(f.calories_kcal||0)*ratio);
 return `<div class="food-row"><div><strong>${f.name}</strong><div class="food-meta">${it.amount}${f.default_unit} • ${k} kcal</div></div><span>${Math.round(Number(f.protein_g||0)*ratio)}g P</span><button class="icon-btn" onclick="deleteFood('${it.id}')">✕</button></div>`
}
document.querySelectorAll("[data-water]").forEach(b=>b.onclick=()=>{todayNutrition().water+=Number(b.dataset.water);saveDB();renderNutrition();renderDashboard()})
window.deleteFood=id=>{const n=todayNutrition();n.items=n.items.filter(i=>i.id!==id);saveDB();renderNutrition();renderDashboard()}

function openModal(html){document.getElementById("modalSheet").innerHTML=html;document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
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
 document.getElementById("foodResults").innerHTML=list.map(f=>`<button class="search-item" onclick="chooseFood('${f.food_id}','${meal}')"><span><strong>${f.name}</strong><small>${f.category} • ${f.calories_kcal} kcal / ${f.nutrition_basis_amount}${f.default_unit}</small></span><span>＋</span></button>`).join("");
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
 <p class="muted">${f.calories_kcal} kcal • P ${f.protein_g} • C ${f.carbs_g} • F ${f.fat_g} per ${f.nutrition_basis_amount}${f.nutrition_basis_unit}</p>
 ${micros?`<p class="muted tiny">${micros}</p>`:""}
 <p class="muted tiny">${f.nutrition_source||""}</p>
 <label>Amount (${f.default_unit})<input id="foodAmount" type="number" step=".1" value="${f.default_amount||100}"></label>
 <button class="primary" onclick="logFood('${foodId}','${meal}')">Add to ${meal}</button>`)
}
window.logFood=(foodId,meal)=>{const amount=Number(document.getElementById("foodAmount").value);if(!amount)return;t=todayNutrition();t.items.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),foodId,meal,amount});saveDB();closeModal();renderNutrition();renderDashboard();toast("Added")}
window.openCustomFood=(meal)=>{
 openModal(`<div class="row-between"><h3>Custom food</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
 <div class="form-stack"><label>Name<input id="cfName"></label><label>Unit<select id="cfUnit"><option>g</option><option>ml</option></select></label><label>Nutrition basis<input id="cfBasis" type="number" value="100"></label>
 <label>Calories<input id="cfKcal" type="number"></label><label>Protein g<input id="cfP" type="number" step=".1"></label><label>Carbs g<input id="cfC" type="number" step=".1"></label><label>Fat g<input id="cfF" type="number" step=".1"></label></div>
 <button class="primary" onclick="saveCustomFood('${meal}')">Save & add</button>`)
}
window.saveCustomFood=(meal)=>{
 const name=document.getElementById("cfName").value.trim();if(!name)return;
 const id="custom_"+Date.now();const f={food_id:id,name,category:"Custom",subcategory:"Custom",default_amount:Number(document.getElementById("cfBasis").value)||100,default_unit:document.getElementById("cfUnit").value,nutrition_basis_amount:Number(document.getElementById("cfBasis").value)||100,nutrition_basis_unit:document.getElementById("cfUnit").value,calories_kcal:Number(document.getElementById("cfKcal").value)||0,protein_g:Number(document.getElementById("cfP").value)||0,carbs_g:Number(document.getElementById("cfC").value)||0,fat_g:Number(document.getElementById("cfF").value)||0,fiber_g:0,is_custom:true};
 db.customFoods.push(f);saveDB();chooseFood(id,meal);
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
 const ds=Object.keys(db.workouts).filter(d=>d<today()).sort().reverse();for(const d of ds){const e=db.workouts[d]?.exercises?.find(x=>x.exerciseId===exId);if(e)return e}return null
}
function exerciseCard(x,i){
 const e=EXERCISE_LIBRARY.find(z=>z.id===x.exerciseId),prev=lastExercisePerformance(x.exerciseId);
 const prevTxt=prev?prev.sets.filter(s=>s.done).map(s=>`${s.weight||"BW"}×${s.reps}`).join(", "):"No previous session";
 return `<div class="exercise-card"><div class="exercise-title"><div><h3>${e.name}</h3><div class="previous">Last: ${prevTxt}</div></div><button class="icon-btn" onclick="replaceExercise(${i})">↻</button></div>
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
 openModal(`<div class="row-between"><h3>Replace ${old.name}</h3><button class="icon-btn" onclick="closeModal()">✕</button></div><div class="search-results">${opts.map(e=>`<button class="search-item" onclick="doReplace(${i},'${e.id}')"><span><strong>${e.name}</strong><small>${e.equipment}</small></span><span>→</span></button>`).join("")}</div>`)
}
window.doReplace=(i,id)=>{ensureWorkout().exercises[i]={exerciseId:id,sets:[{reps:"",weight:"",done:false},{reps:"",weight:"",done:false},{reps:"",weight:"",done:false}]};saveDB();closeModal();renderTraining()}
document.getElementById("addExerciseBtn").onclick=()=>{
 const w=ensureWorkout();openModal(`<div class="row-between"><h3>Add exercise</h3><button class="icon-btn" onclick="closeModal()">✕</button></div><input id="exSearch" placeholder="Search exercise"><div id="exResults" class="search-results" style="margin-top:10px"></div>`);
 const s=document.getElementById("exSearch");const render=()=>{const q=s.value.toLowerCase();document.getElementById("exResults").innerHTML=EXERCISE_LIBRARY.filter(e=>!q||`${e.name} ${e.muscle}`.toLowerCase().includes(q)).slice(0,40).map(e=>`<button class="search-item" onclick="addExercise('${e.id}')"><span><strong>${e.name}</strong><small>${e.muscle}</small></span><span>＋</span></button>`).join("")};s.oninput=render;render();
}
window.addExercise=id=>{ensureWorkout().exercises.push({exerciseId:id,sets:[{reps:"",weight:"",done:false},{reps:"",weight:"",done:false},{reps:"",weight:"",done:false}]});saveDB();closeModal();renderTraining()}
document.getElementById("saveCardioBtn").onclick=()=>{
 const w=ensureWorkout(),mins=Number(document.getElementById("cardioMinutes").value)||0,dist=Number(document.getElementById("cardioDistance").value)||0;
 w.cardioMinutes=mins;w.cardioDistance=dist;
 // simple MET estimate, clearly approximate
 const met=document.getElementById("cardioType").value==="Walking"?3.8:5.0;w.cardioCalories=Math.round(met*currentWeightKg()*(mins/60));
 saveDB();renderTraining();renderNutrition();renderDashboard();toast("Cardio saved");
}
document.getElementById("saveWorkoutBtn").onclick=()=>{
 const w=ensureWorkout();w.finished=true;
 // estimated strength training expenditure using moderate MET 5.0
 w.liftingCalories=Math.round(5.0*currentWeightKg()*(db.profile.duration/60));
 // PR detection
 const prs=[];
 w.exercises.forEach(ex=>{
   const hist=Object.entries(db.workouts).filter(([d])=>d<today()).flatMap(([,wo])=>wo.exercises||[]).filter(x=>x.exerciseId===ex.exerciseId);
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

document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));document.getElementById(b.dataset.view).classList.add("active");if(b.dataset.view==="progressView")renderProgress()})

document.getElementById("profileBtn").onclick=()=>{
 const t=calcTargets(db.profile,currentWeightKg());openModal(`<div class="row-between"><h3>Your setup</h3><button class="icon-btn" onclick="closeModal()">✕</button></div>
 <div class="metric-grid">${metric("Goal",db.profile.goal)}${metric("Body type",db.profile.bodyType)}${metric("Base calories",t.kcal)}${metric("Protein",t.protein+"g")}</div>
 <p class="muted tiny">Targets are reviewed from your weight trend. Daily scale noise does not automatically change them.</p>
 <div class="card" style="margin-top:12px"><strong>Developer test date</strong><p class="muted tiny">Use this only to test future weigh-in gates. Leave blank for the real date.</p>
 <input id="testDateInput" type="date" value="${localStorage.getItem("fitos_test_date")||""}">
 <div class="backup-grid" style="margin-top:8px"><button class="secondary" onclick="setTestDate()">Use test date</button><button class="secondary" onclick="clearTestDate()">Use real date</button></div></div>
 <button class="secondary" style="width:100%" onclick="resetApp()">Reset app</button>`)
}
window.setTestDate=()=>{const v=document.getElementById("testDateInput").value;if(!v)return toast("Pick a date");localStorage.setItem("fitos_test_date",v);location.reload()}
window.clearTestDate=()=>{localStorage.removeItem("fitos_test_date");location.reload()}
window.resetApp=()=>{if(confirm("Erase all FitOS data on this phone?")){localStorage.removeItem(DB_KEY);localStorage.removeItem("fitos_test_date");location.reload()}}

document.getElementById("exportBackupBtn").onclick=()=>{
 const blob=new Blob([JSON.stringify({app:"FitOS",version:1,exportedAt:new Date().toISOString(),data:db},null,2)],{type:"application/json"});const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=`FitOS-backup-${today()}.json`;a.click();URL.revokeObjectURL(u);db.lastBackup=new Date().toISOString();saveDB();document.getElementById("backupStatus").textContent="Backup exported just now.";
}
document.getElementById("importBackup").onchange=async e=>{const f=e.target.files?.[0];if(!f)return;try{const p=JSON.parse(await f.text()),d=p.data||p;if(!d.profile||!d.weights)throw 0;if(!confirm("Replace current FitOS data with this backup?"))return;db=d;saveDB();location.reload()}catch{toast("Invalid backup")}}
function closeModal(){document.getElementById("modal").classList.add("hidden")}window.closeModal=closeModal;

start();

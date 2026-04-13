const { 
  weatherExample, 
  irrigationExample, 
  fertilizerExample, 
  alertExamples 
} = require('./chatbot-examples');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function typeWriter(text) {
  process.stdout.write('  ');
  for (const char of text) {
    process.stdout.write(char);
    await sleep(10); // Typing effect
  }
  process.stdout.write('\n');
}

async function runDemo() {
  console.clear();
  console.log('\n🌾 AGRIURBAN AI CHATBOT - LIVE DEMO 🌾\n');
  console.log('Initializing demo sequence...\n');
  await sleep(1000);

  // SCENARIO 1: WEATHER
  console.log('--------------------------------------------------');
  console.log(`📍 SCENARIO 1: ${weatherExample.scenario}`);
  console.log('--------------------------------------------------\n');
  
  for (const msg of weatherExample.conversation) {
    console.log(`👤 FARMER: ${msg.user}`);
    await sleep(800);
    console.log(`\n🤖 AI BOT:`);
    await typeWriter(msg.bot);
    console.log('');
    await sleep(1500);
  }

  // SCENARIO 2: IRRIGATION
  console.log('--------------------------------------------------');
  console.log(`📍 SCENARIO 2: ${irrigationExample.scenario}`);
  console.log('--------------------------------------------------\n');

  for (const msg of irrigationExample.conversation) {
    console.log(`👤 FARMER: ${msg.user}`);
    await sleep(800);
    console.log(`\n🤖 AI BOT:`);
    await typeWriter(msg.bot);
    console.log('');
    await sleep(1500);
  }

  // SCENARIO 3: ALERTS
  console.log('--------------------------------------------------');
  console.log(`📍 SCENARIO 3: Proactive Alerts`);
  console.log('--------------------------------------------------\n');

  const alert = alertExamples.alerts[0]; // Heavy Rain
  console.log(`🚨 SYSTEM ALERT TRIGGERED: ${alert.type.toUpperCase()}`);
  await sleep(500);
  console.log(`\n🤖 AI BOT:`);
  await typeWriter(alert.message);
  console.log('');

  console.log('\n✨ DEMO COMPLETE');
  console.log('   Try these yourself in the application!');
}

runDemo();

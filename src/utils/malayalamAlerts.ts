// Funny Malayalam Alerts for Chai-Split
import type { OrderItem } from '../types'

export interface MalayalamAlertResult {
  conditionKey: string
  category: string
  reasonMalayalam: string
  text: string
  alertNumber: 1 | 2 | 3
}

export const MALAYALAM_ALERTS: Record<
  string,
  { category: string; reasonMalayalam: string; alerts: [string, string, string] }
> = {
  // 1. Single Item & Tiny Bill Extremes
  single_item: {
    category: '🥚 Single Item',
    reasonMalayalam: 'ആകെ ഒരു ഐറ്റം മാത്രം ഓർഡർ ചെയ്തതുകൊണ്ട്',
    alerts: [
      'ആകെ ഒരു സിംഗിൾ ഐറ്റം! ഡയറ്റിലാണോ അതോ പോക്കറ്റ് കാലിയാണോടോ? 🫥 🤏',
      'ഒരു ഐറ്റം മാത്രം ഓർഡർ ചെയ്ത് നീ ഈ ആപ്പിനെ അപമാനിക്കരുത്! 🥲 📉',
      'ഇത്രയും വലിയ മെനുവിൽ നിന്ന് ആകെ ഒന്നോ? എന്തിനാപ്പാ ഈ കടുംവെട്ട്! 🧐 🤏'
    ]
  },
  bill_exact_10: {
    category: '🪙 Tiny Bill (₹10)',
    reasonMalayalam: 'കൃത്യം 10 രൂപയുടെ ബില്ല് ആയതുകൊണ്ട്',
    alerts: [
      'വെറും പത്ത് രൂപ! കടക്കാരൻ ബാക്കി തരാൻ വച്ചിരുന്ന ചില്ലറ നാണയം നീ തന്നെ എടുത്തോ. 🪙 😂',
      'പത്ത് രൂപയുടെ ബില്ല്! പേയ്മെന്റ് ഗേറ്റ്വേ ചാർജ് ഇതിലും കൂടുതൽ വരുമല്ലോടാ! 💸 🥲',
      'വെറും 10 രൂപയ്ക്ക് ചായ കുടിക്കാൻ വരാൻ നിനക്ക് എങ്ങനെ തോന്നിയെടാ പുണ്യാളാ! 🪙 👀'
    ]
  },
  bill_under_15: {
    category: '📉 Tiny Bill (< ₹15)',
    reasonMalayalam: 'ആകെ ബില്ല് 15 രൂപയിൽ താഴെയായതുകൊണ്ട്',
    alerts: [
      'ഈ ബില്ല് കാണുമ്പോൾ ആപ്പിന്റെ സെർവർ കോസ്റ്റ് പോലും ഓർത്ത് എനിക്ക് സങ്കടം വരുന്നു! 📉 🥲',
      'ബില്ല് കണ്ട് കടക്കാരൻ കരയുന്നുണ്ട്! അടുത്ത തവണയെങ്കിലും കൂടുതൽ കഴിക്കണേ. 😭 💔',
      'ഇത്രയും ചെറിയ ബില്ല് അടിക്കാൻ ഞങ്ങളുടെ ബില്ലിംഗ് മെഷീൻ പോലും സമ്മതിക്കുന്നില്ല! 🤖 ❌'
    ]
  },

  // 2. Total Bill & Average Spend Conditions
  normal_average: {
    category: '🎯 Average Spend (₹15 - ₹25)',
    reasonMalayalam: 'ബില്ല് കൃത്യം നോർമൽ ആവറേജ് ബഡ്ജറ്റിൽ (₹15 - ₹25) ഒതുങ്ങിയതുകൊണ്ട്',
    alerts: [
      'കൃത്യം ബഡ്ജറ്റിൽ ഒതുക്കി! നീ ഒരു മാതൃകാ ചായ കുടിയൻ തന്നെ. 🎯 🤝',
      'പെർഫെക്റ്റ് ആവറേജ് ബില്ല്! കണക്കപ്പിള്ളമാരെ തോൽപ്പിക്കുന്ന ബുദ്ധി തന്നെ. 🧠 📊',
      'ബഡ്ജറ്റ് പ്ലാനിംഗിൽ നീ ഒരു സിങ്കം തന്നെ! ആവറേജിൽ ഒതുക്കി. 🦁 ✨'
    ]
  },
  bill_20_30: {
    category: '💸 Warming Up Bill (₹21 - ₹30)',
    reasonMalayalam: 'ബില്ല് 20 രൂപയ്ക്ക് മുകളിൽ (₹21 - ₹30) ചൂടായതുകൊണ്ട്',
    alerts: [
      'ബില്ല് അൻപത് കടന്നു മക്കളെ! പോക്കറ്റിൽ കൈയിടാൻ സമയമായി. 💸 👀',
      'ബില്ല് പതുക്കെ ചൂടാവുന്നുണ്ട്! ഗൂഗിൾ പേ ആപ്പ് ബാക്ക്ഗ്രൗണ്ടിൽ ഓപ്പൺ ചെയ്തു വെച്ചോ. 📱 🔥',
      'അൻപത് രൂപ കഴിഞ്ഞു! ഇനി പതിയെ വലിഞ്ഞു കളയാൻ നോക്കിക്കോ. 🏃‍♂️ 💨'
    ]
  },
  bill_30_50: {
    category: '🏏 Century Bill (₹31 - ₹50)',
    reasonMalayalam: 'ബില്ല് 30 രൂപയ്ക്ക് മുകളിൽ (₹31 - ₹50) എത്തിയതുകൊണ്ട്',
    alerts: [
      'ഇന്ന് ചായക്കടക്കാരൻ കാശ് എണ്ണി തളരും! ആരെങ്കിലും ഒരാൾ ഗൂഗിൾ പേ എടുക്കേണ്ടി വരും. 🤑 📱',
      'ബില്ല് സെഞ്ചുറി അടിച്ചു! ഗ്രൂപ്പിലെ ധനമന്ത്രി ആരാണെന്ന് വച്ചാൽ പൈസ എടുത്തോ. 🏏 💸',
      'ഇത്രയും വലിയ ബില്ല് അടക്കാൻ ഇവിടെ ആരുടെയെങ്കിലും കയ്യിൽ കാശുണ്ടോ അതോ ഞാൻ തരണോ? 🤔 💳'
    ]
  },
  bill_over_50: {
    category: '🏦 Heavy Bill (> ₹50)',
    reasonMalayalam: 'ബില്ല് 50 രൂപയ്ക്ക് മുകളിൽ കനത്ത തുകയായതുകൊണ്ട്',
    alerts: [
      'ചായ കുടിക്കാൻ വന്നിട്ട് കട വാങ്ങാൻ ഉള്ള ബില്ല് വരുത്തിവെച്ചല്ലോടാ! 🤯 🏦',
      'എന്തോ തീറ്റയാടെയ്! ബില്ല് കണ്ട് ചായക്കടക്കാരൻ പുതിയ വണ്ടി ബുക്ക് ചെയ്തു. 🚗 💰',
      'ഈ ബില്ല് അടച്ചു തീർക്കാൻ നമുക്ക് ആരുടെയെങ്കിലും ആധാരം പണയം വെക്കേണ്ടി വരും! 📄 😭'
    ]
  },

  // 3. Item-Specific Quantity Alerts
  item_chaya: {
    category: '☕ Chaya Lover',
    reasonMalayalam: 'ചായ ഓർഡർ ചെയ്തതുകൊണ്ട്',
    alerts: [
      'ചായ കുടിച്ചു കുടിച്ചു അവസാനം വയറ്റിൽ ചായത്തോട്ടം ഉണ്ടാക്കുമല്ലോടാ! ☕ 🌱',
      'ഇത്രയും ചായ കുടിക്കാൻ നീയെന്താ ബോഡി മൊത്തം ലിക്വിഡ് ഫോമിൽ ആക്കാൻ നോക്കുവാണോ? ☕ 🥴',
      'ചായ അടിച്ച് അടിച്ച് അവസാനം കപ്പ് പോലും തളർന്നു കാണും! ☕ 😩'
    ]
  },
  item_coffee: {
    category: '☕ Coffee Addict',
    reasonMalayalam: 'കാപ്പി ഓർഡർ ചെയ്തതുകൊണ്ട്',
    alerts: [
      'ഇത്രയും കാപ്പി കുടിക്കാൻ നീയെന്താ ഇന്ന് രാത്രി ഉറങ്ങാൻ ഉദ്ദേശ്യമില്ലേ? ☕ 😳',
      'കാപ്പി കുടി കണ്ട് ബ്രസീൽ കാപ്പിത്തോട്ടം പോലും വഴിമാറി തരും! ☕ 🇧🇷',
      'ഇത്രയും കാപ്പി അടിച്ചാൽ പിന്നെ ഉറക്ക ഗുളിക കഴിച്ചാൽ പോലും ഉറക്കം വരില്ല മോനേ! ☕ 🦉'
    ]
  },
  item_samosa: {
    category: '📐 Samosa Fighter (2+)',
    reasonMalayalam: '2-ൽ കൂടുതൽ സമൂസ അകത്താക്കാൻ നോക്കുന്നതുകൊണ്ട്',
    alerts: [
      'ഇത്രയും സമൂസ തിന്നിട്ട് ചായ കുടിക്കാൻ വയറ്റിൽ സ്ഥലമുണ്ടോടോ?! 📐 🤰',
      'സമൂസയുടെ മൂന്ന് മൂലയും നിന്റെ വയറ്റിൽ ചെന്ന് ഇന്ന് വഴക്കുണ്ടാക്കും! 📐 💥',
      'കടയിലെ സമൂസ മൊത്തം നീ ഒറ്റയ്ക്ക് തീർക്കാൻ ക്വട്ടേഷൻ എടുത്തിട്ടുണ്ടോ? 📐 🤯'
    ]
  },
  item_omlette: {
    category: '🍳 Omlette Monster (2+)',
    reasonMalayalam: '2-ൽ കൂടുതൽ ഒംലറ്റ് ഓർഡർ ചെയ്തതുകൊണ്ട്',
    alerts: [
      'ഒരു ഒന്നൊന്നര ഒംലറ്റ് തീറ്റ തന്നെ! ഉള്ളി അരിഞ്ഞ് കടക്കാരൻ തളർന്നു കാണും. 🍳 🧅',
      'ഇത്രയും ഒംലെറ്റ് അകത്താക്കാൻ നീയെന്താ ഉള്ളി തിന്നുന്ന മെഷീൻ ആണോ? 🍳 🤖',
      'ഒംലെറ്റ് ഇങ്ങനെ അടിച്ചു കയറ്റിയാൽ കോഴിക്കടക്കാരൻ നാളെ മുതൽ വില കൂട്ടും! 🍳 🐔'
    ]
  },
  item_dosha: {
    category: '🥞 Dosha Machine (2+)',
    reasonMalayalam: '2-ൽ കൂടുതൽ ദോശ അടിക്കാൻ നോക്കുന്നതുകൊണ്ട്',
    alerts: [
      'ദോശ ഇങ്ങനെ അടിച്ചു കയറ്റാൻ ഇതെന്താ മദ്രാസ് മെയിലോ?! 🥞 🚂',
      'ദോശ ചുട്ടു തീർക്കാൻ കടക്കാരൻ ഇന്ന് ഓവർടൈം പണിയെടുക്കേണ്ടി വരും! 🥞 🥵',
      'ഇത്രയും ദോശ തിന്നിട്ടും നിന്റെ വിശപ്പ് മാറിയില്ലേ മനുഷ്യാ! 🥞 👹'
    ]
  },
  item_porotta: {
    category: '🌀 Porotta Fanatic (2+)',
    reasonMalayalam: '2-ൽ കൂടുതൽ പൊറോട്ട ഓർഡർ ചെയ്തതുകൊണ്ട്',
    alerts: [
      'എന്തോ തീറ്റയാടെയ്! ബില്ല് കണ്ടപ്പോൾ പൊറോട്ടയുടെ എണ്ണം കണ്ട് കണ്ണുതള്ളിപ്പോയി! 🌀 🥴',
      'പൊറോട്ടയുടെ ലെയറുകൾ എണ്ണി എണ്ണി എന്റെ കാൽക്കുലേറ്റർ കേടായി! 🌀 🧮',
      'മൈദ തിന്നു തീർക്കാൻ നീയെന്താ ഒരു റേഷൻകട ഒളിപ്പിച്ചു വെച്ചേക്കുവാണോ? 🌀 🥖'
    ]
  },
  item_bullseye: {
    category: '🍳 Bull\'s Eye Special',
    reasonMalayalam: 'ബുൾസ് ഐ ഓർഡർ ചെയ്തതുകൊണ്ട്',
    alerts: [
      'ബുൾസ് ഐ ഇത്രയും തിന്നാൻ നിന്റെ കണ്ണെന്താ ആപ്പിലെ മുട്ട പോലെ ഇരിക്കുവാണോ? 🍳 👁️',
      'ബുൾസ് ഐ അടിച്ച് നീ ഇന്ന് ആരുടെ കണ്ണിലാണ് കുത്താൻ പോകുന്നത്? 🍳 🎯',
      'ഹാഫ് ബോയിൽ വിഴുങ്ങുന്നതിൽ നീ ഒരു പിഎച്ച്ഡി തന്നെ എടുത്തിട്ടുണ്ട്! 🍳 🎓'
    ]
  },
  item_puffs: {
    category: '🥐 Puffs Master',
    reasonMalayalam: 'പഫ്സ് ഓർഡർ ചെയ്തതുകൊണ്ട്',
    alerts: [
      'പഫ്സ് തിന്നു തീർത്തു ഇവൻ കടയിലെ കാറ്റും ലെയറും മൊത്തം ഒപ്പിയെടുത്തല്ലോ! 🥐 💨',
      'പഫ്സ് തിന്നുന്നത് കണ്ടാൽ തോന്നും ഉള്ളിൽ സ്വർണ്ണനാണയം ഒളിപ്പിച്ചു വെച്ചിട്ടുണ്ടെന്ന്! 🥐 🪙',
      'ഈ പഫ്സ് തിന്നുന്ന കപ്പാസിറ്റി വച്ച് നിനക്ക് ഒരു ബേക്കറി തന്നെ തുടങ്ങാം! 🥐 🏪'
    ]
  },
  item_parippvada: {
    category: '🍩 Parippvada Crunch',
    reasonMalayalam: 'പരിപ്പുവട ഓർഡർ ചെയ്തതുകൊണ്ട്',
    alerts: [
      'പരിപ്പുവട കടിച്ചുകൂട്ടി അവസാനം പല്ല് സൂക്ഷിക്കണേ മക്കളെ! 🍩 🦷',
      'പരിപ്പുവട കടിച്ചു പൊട്ടിക്കാൻ നിന്റേത് താടിയെല്ല് ആണോ അതോ കോൺക്രീറ്റ് ആണോ? 🍩 🏗️',
      'കടയിലെ പരിപ്പുവടയുടെ സ്റ്റോക്ക് മൊത്തം നീ ഇന്ന് ലോക്ക് ചെയ്തല്ലോടാ! 🍩 🔒'
    ]
  },
  item_pokkavada: {
    category: '🍟 Pokkavada Cruncher (2+)',
    reasonMalayalam: '2-ൽ കൂടുതൽ പൊക്കവട ഓർഡർ ചെയ്തതുകൊണ്ട്',
    alerts: [
      'പൊക്കവട കൊറിച്ചു കൊറിച്ചു ഇന്ന് നീ ഇവിടെത്തന്നെ കൂടാൻ ആണോ പ്ലാൻ? 🍟 🍿',
      'പൊക്കവട തിന്നുന്ന ശബ്ദം കേട്ട് ചായക്കടയിലെ റേഡിയോ പോലും തളർന്നു! 🍟 📻',
      'എണ്ണപ്പലഹാരം ഇത്രയും കൊറിക്കാൻ ഇവനൊരു സ്പെഷ്യൽ പല്ല് തന്നെയുണ്ട്! 🍟 🦷'
    ]
  },
  item_boiledegg: {
    category: '🥚 Gym Boiled Egg (2+)',
    reasonMalayalam: '2-ൽ കൂടുതൽ പുഴുങ്ങിയ മുട്ട ഓർഡർ ചെയ്തതുകൊണ്ട്',
    alerts: [
      'പുഴുങ്ങിയ മുട്ട ഇത്രയും വിഴുങ്ങാൻ നീയെന്താ ജിമ്മിൽ പോക്ക് തുടങ്ങിയോ? 🥚 💪',
      'മുട്ട പുഴുങ്ങി പുഴുങ്ങി അടുപ്പിലെ ഗ്യാസ് തീർന്നു മക്കളെ! 🥚 🔥',
      'ഇത്രയും പുഴുങ്ങിയ മുട്ട തിന്നാൽ അടുത്ത 5 മീറ്റർ ദൂരത്തിൽ ആരും നിൽക്കില്ല! 🥚 💨'
    ]
  },
  item_passpass: {
    category: '🍬 Pass Pass Hacker',
    reasonMalayalam: 'പാസ് പാസ് ഓർഡർ ചെയ്തതുകൊണ്ട്',
    alerts: [
      'ഒരു രൂപയുടെ പാസ് പാസും വാങ്ങി ഇവൻ ആപ്പ് മൊത്തം ഹാക്ക് ചെയ്യാൻ നോക്കുവാണോ? 🍬 👾',
      'പാസ് പാസ് തിന്നു തീർക്കാൻ നീയെന്താ എൽകെജി ക്ലാസിലെ കുട്ടിയാണോ? 🍬 🧒',
      'വായിൽ സുഗന്ധം വരാൻ വേണ്ടി കടയിലെ പാസ് പാസ് പാക്കറ്റ് മൊത്തം എടുത്തല്ലേടാ! 🍬 💨'
    ]
  },

  // 4. Group & Combo Conditions
  combo_eggs: {
    category: '🐔 Egg Overload (2+)',
    reasonMalayalam: '2-ൽ കൂടുതൽ മുട്ട വിഭവങ്ങൾ ഒന്നിച്ചു ചേർത്തതുകൊണ്ട്',
    alerts: [
      'മുട്ട മൊത്തം തീർക്കാൻ ഇറങ്ങിയേക്കുവാണോ? കോഴി പോലും ഇത്രയും മുട്ട ഇട്ടിട്ടുണ്ടാകില്ല! 🐔 🥚',
      'കോഴി വർഗ്ഗത്തിന്റെ അന്തകൻ! മുട്ട കണ്ടാൽ നിനക്ക് ഒരു ദയയും ഇല്ലല്ലേടാ? 🐔 🍳',
      'ഇന്ന് ഈ ചായക്കടയിൽ മുട്ട തിന്നു തീർക്കാൻ ഒരു പുതിയ റെക്കോർഡ് ഇട്ടിട്ടുണ്ട്! 🏆 🥚'
    ]
  },
  tea_no_snacks: {
    category: '☕ Pure Liquid Diet',
    reasonMalayalam: 'കൂടെ കടിക്കാൻ പലഹാരങ്ങൾ ഒന്നുമില്ലാതെ ചായ/കാപ്പി മാത്രം കുടിക്കുന്നതുകൊണ്ട്',
    alerts: [
      'വെറും ചായ കുടി മാത്രേ ഉള്ളൂല്ലേ? കടിച്ചുകൂടാൻ ഒരു പരിപ്പുവടയെങ്കിലും മേടിക്കെടോ! ☕ 🫓',
      'വെറും ലിക്വിഡ് ഡയറ്റ് ആണോ മക്കളെ? കൂടെ കടിക്കാൻ എന്തെങ്കിലും ഒപ്പിച്ചു കൂടെ! ☕ 🧐',
      'കടിക്കാൻ ഒന്നും ഇല്ലാതെ ചായ കുടിക്കുന്നത് ചായക്കടയിലെ നിയമങ്ങൾക്ക് വിരുദ്ധമാണ്! ☕ 📜'
    ]
  },
  combo_porotta_omlette: {
    category: '🌀🍳 Porotta + Omlette Combo',
    reasonMalayalam: 'പൊറോട്ടയും ഒംലറ്റും ചേർത്ത കോമ്പോ തിരഞ്ഞെടുത്തതുകൊണ്ട്',
    alerts: [
      'പൊറോട്ടയും ഒംലെറ്റും! കൊള്ളാം... നാവിലെ രുചി മുകുളങ്ങൾ ഇപ്പോൾ ഉണരും! 🌀 🍳',
      'പൊറോട്ട-ഒംലെറ്റ് കോമ്പോ! ഇത് കഴിക്കാൻ വേണ്ടി മാത്രം മൂന്ന് ദിവസം പട്ടിണി കിടന്നതാണോ? 🌀 🍳',
      'അനശ്വരമായ കോമ്പോ! ഇതിലും നല്ലൊരു ജോഡി വേറെ സ്വപ്നങ്ങളിൽ മാത്രം. 🌀 🍳'
    ]
  },
  combo_samosa_tea_coffee: {
    category: '📐☕ Samosa & Chai Combo',
    reasonMalayalam: 'ചായയും സമൂസയും ഒന്നിച്ചു ചേർത്ത കോമ്പോ ആയതുകൊണ്ട്',
    alerts: [
      'ചായയും സമൂസയും! വൈകുന്നേരത്തെ മീറ്റിംഗിനേക്കാൾ സ്കോപ്പുള്ള കോമ്പോ. 📐 ☕',
      'സമൂസയും ചായയും ഒരുമിച്ചെത്തുമ്പോൾ ഉണ്ടാകുന്ന ആ ഫീൽ... വേറെ ലെവൽ! 📐 ☕',
      'ക്ലാസിക് തട്ടുകട വൈബ്! സമൂസ കടിച്ച് ചായ കുടിക്കുന്ന സുഖം ഒന്നു വേറെ തന്നെ. 📐 ☕'
    ]
  },
  trio_porotta_omlette_tea: {
    category: '👑 The Royal Trio',
    reasonMalayalam: 'പൊറോട്ട, ഒംലറ്റ്, ചായ രാജകീയ കോമ്പോ തിരഞ്ഞെടുത്തതുകൊണ്ട്',
    alerts: [
      'രാജകീയ ചായ കുടി! പൊറോട്ട, ഒംലെറ്റ്, ചായ... ഇതിലും വലിയൊരു സുഖം വേറെയില്ല. 👑 ✨',
      'ഹെവി ഐറ്റംസ്! ഇത് ചായ കുടിയല്ല, ഒരു mini കല്യാണ സദ്യ തന്നെയുണ്ട്. 👑 🍽️',
      'പൊറോട്ട, ഒംലെറ്റ്, ചായ! ഇത് തിന്നാൽ പിന്നെ അടുത്ത മൂന്ന് ദിവസത്തേക്ക് വിശക്കില്ല. 👑 🔋'
    ]
  },

  // 5. Checkout & Split Action Alerts
  checkout_final: {
    category: '💳 Final Checkout',
    reasonMalayalam: 'ഫൈനൽ ചെക്കൗട്ട് ബട്ടൺ ക്ലിക്ക് ചെയ്തതുകൊണ്ട്',
    alerts: [
      'കഴിച്ചതൊക്കെ ദഹിക്കുന്നതിന് മുൻപ് ഗൂഗിൾ പേ എടുത്തോ, അല്ലെങ്കിൽ പാത്രം കഴുകേണ്ടി വരും! 🧼 🍽️',
      'ബില്ല് പേ ചെയ്യാൻ സമയമായി മക്കളെ! പോക്കറ്റിൽ കാശുള്ളവർ വേഗം മുന്നോട്ട് വരിക. 💸 🏃‍♂️',
      'കൈ നനയ്ക്കാതെ തിന്നതല്ലേ, ഇനി പതിയെ ക്യാഷ് കൗണ്ടറിലേക്ക് നടന്നു പോയ്ക്കോ! 💳 🚶‍♂️'
    ]
  },
  split_bill: {
    category: '📊 Split Bill',
    reasonMalayalam: 'ബില്ല് എല്ലാവർക്കുമായി വീതിക്കാൻ (Split Bill) തുടങ്ങിയതുകൊണ്ട്',
    alerts: [
      'തീറ്റ മറ്റുള്ളവരുടേത്, ബില്ല് നിന്റേതും! നീ ഒരു ജനസേവകൻ തന്നെ! 😇 💸',
      'ബില്ല് ഷെയർ ചെയ്യാൻ പോകുവാണോ? ഗ്രൂപ്പിലെ ലോഭന്മാരെ കൃത്യമായി കണ്ടുപിടിക്കാം! 📊 🔍',
      'പൈസ ഭാഗിക്കാൻ സമയമായി! ഇനി ആരെങ്കിലും ഫോൺ ഓഫാക്കി വലിഞ്ഞു കളയുമോ എന്ന് നോക്കാം. 📱 👀'
    ]
  },
  split_bill_under_25: {
    category: '🪙 Split Bill (< ₹25)',
    reasonMalayalam: 'ഓരോരുത്തർക്കും ₹25-ൽ താഴെ വരുന്ന ചെറിയ തുക സ്പ്ലിറ്റ് ചെയ്യാൻ നോക്കിയതുകൊണ്ട്',
    alerts: [
      'ഈ ചെറിയ ബില്ല് ഷെയർ ചെയ്യാൻ നിനക്ക് നാണമില്ലല്ലോടാ കടുംവെട്ടീ! 🤏 😂',
      'വെറും ചില്ലറ പൈസയ്ക്ക് വേണ്ടി പിശുക്ക് കാണിക്കുന്ന ലോകത്തിലെ ഏക ജീവി! 🪙 🫵',
      'ഈ ചെറിയ തുക ഷെയർ ചെയ്യാൻ നോക്കുന്ന നിന്റെ ആ മനസ്സ്... അത് കാണാതെ പോകരുത്! 🤏 🥹'
    ]
  }
}

interface ParsedCart {
  teaCount: number
  coffeeCount: number
  samosaCount: number
  omletteCount: number
  doshaCount: number
  porottaCount: number
  bullseyeCount: number
  puffsCount: number
  parippvadaCount: number
  pokkavadaCount: number
  boiledeggCount: number
  passpassCount: number
  totalSolidSnacks: number
  totalEggs: number
  totalQuantity: number
  totalBill: number
}

export function parseCartItems(items: OrderItem[], totalAmount?: number): ParsedCart {
  let teaCount = 0
  let coffeeCount = 0
  let samosaCount = 0
  let omletteCount = 0
  let doshaCount = 0
  let porottaCount = 0
  let bullseyeCount = 0
  let puffsCount = 0
  let parippvadaCount = 0
  let pokkavadaCount = 0
  let boiledeggCount = 0
  let passpassCount = 0
  let totalSolidSnacks = 0
  let calculatedTotal = 0
  let totalQuantity = 0

  items.forEach(item => {
    const q = item.quantity || 1
    totalQuantity += q
    calculatedTotal += (item.price || 0) * q
    const clean = (item.name || '').toLowerCase().trim()

    let isBeverageOrPass = false

    if (clean.includes('chaya') || clean.includes('chai') || clean.includes('tea')) {
      teaCount += q
      isBeverageOrPass = true
    } else if (clean.includes('coffee') || clean.includes('kaapi') || clean.includes('bru')) {
      coffeeCount += q
      isBeverageOrPass = true
    } else if (clean.includes('pass') || clean.includes('passpass')) {
      passpassCount += q
      isBeverageOrPass = true
    }

    if (clean.includes('samoza') || clean.includes('samosa')) {
      samosaCount += q
    }
    if (clean.includes('omlette') || clean.includes('omelette') || clean.includes('omlet')) {
      omletteCount += q
    }
    if (clean.includes('dosha') || clean.includes('dosa')) {
      doshaCount += q
    }
    if (clean.includes('porotta') || clean.includes('parotta') || clean.includes('paratha')) {
      porottaCount += q
    }
    if (clean.includes('bull') || clean.includes('bulls eye') || clean.includes("bull's eye") || clean.includes('half boil')) {
      bullseyeCount += q
    }
    if (clean.includes('puff') || clean.includes('puffs')) {
      puffsCount += q
    }
    if (clean.includes('paripp') || clean.includes('parippu') || clean.includes('dal vada') || clean.includes('vada')) {
      parippvadaCount += q
    }
    if (clean.includes('pokka') || clean.includes('pakoda') || clean.includes('pakora')) {
      pokkavadaCount += q
    }
    if (clean.includes('boiled egg') || clean.includes('puzhungiya motta') || clean.includes('egg boiled') || (clean.includes('motta') && !clean.includes('omlette') && !clean.includes('bull'))) {
      boiledeggCount += q
    }

    if (!isBeverageOrPass) {
      totalSolidSnacks += q
    }
  })

  const totalEggs = omletteCount + bullseyeCount + boiledeggCount

  return {
    teaCount,
    coffeeCount,
    samosaCount,
    omletteCount,
    doshaCount,
    porottaCount,
    bullseyeCount,
    puffsCount,
    parippvadaCount,
    pokkavadaCount,
    boiledeggCount,
    passpassCount,
    totalSolidSnacks,
    totalEggs,
    totalQuantity,
    totalBill: totalAmount !== undefined ? totalAmount : calculatedTotal
  }
}

/**
 * Evaluates the cart and context to find all matching conditions,
 * handles overlapping by assigning weights/priorities, and returns
 * a randomly selected alert (Alert 1, 2, or 3) from the best matched conditions.
 */
export function getFunnyMalayalamAlert(
  items: OrderItem[] = [],
  totalAmount?: number,
  context: 'confirm_order' | 'checkout' | 'split_bill' = 'confirm_order',
  perPersonAmount?: number
): MalayalamAlertResult {
  // Handle Split Bill & Checkout actions
  if (context === 'split_bill') {
    const isUnder25 = (perPersonAmount !== undefined ? perPersonAmount : (totalAmount || 0)) < 25
    const key = isUnder25 ? 'split_bill_under_25' : 'split_bill'
    const entry = MALAYALAM_ALERTS[key]
    const randomIdx = Math.floor(Math.random() * 3)
    return {
      conditionKey: key,
      category: entry.category,
      reasonMalayalam: entry.reasonMalayalam,
      text: entry.alerts[randomIdx],
      alertNumber: (randomIdx + 1) as 1 | 2 | 3
    }
  }

  if (context === 'checkout') {
    const entry = MALAYALAM_ALERTS['checkout_final']
    const randomIdx = Math.floor(Math.random() * 3)
    return {
      conditionKey: 'checkout_final',
      category: entry.category,
      reasonMalayalam: entry.reasonMalayalam,
      text: entry.alerts[randomIdx],
      alertNumber: (randomIdx + 1) as 1 | 2 | 3
    }
  }

  // Handle Cart & Order Confirmation conditions
  const cart = parseCartItems(items, totalAmount)
  const candidateKeys: { key: string; weight: number }[] = []

  // --- Priority 1: High Specificity Combos & Trios ---
  if (cart.porottaCount >= 1 && cart.omletteCount >= 1 && cart.teaCount >= 1) {
    candidateKeys.push({ key: 'trio_porotta_omlette_tea', weight: 10 })
  } else if (cart.porottaCount >= 1 && cart.omletteCount >= 1) {
    candidateKeys.push({ key: 'combo_porotta_omlette', weight: 8 })
  }

  if (cart.samosaCount >= 1 && (cart.teaCount >= 1 || cart.coffeeCount >= 1)) {
    candidateKeys.push({ key: 'combo_samosa_tea_coffee', weight: 8 })
  }

  if (cart.totalEggs >= 2) {
    candidateKeys.push({ key: 'combo_eggs', weight: 7 })
  }

  if ((cart.teaCount >= 1 || cart.coffeeCount >= 1) && cart.totalSolidSnacks === 0) {
    candidateKeys.push({ key: 'tea_no_snacks', weight: 7 })
  }

  // --- Priority 2: Specific Item Counts ---
  if (cart.porottaCount >= 2) candidateKeys.push({ key: 'item_porotta', weight: 6 })
  if (cart.omletteCount >= 2) candidateKeys.push({ key: 'item_omlette', weight: 6 })
  if (cart.samosaCount >= 2) candidateKeys.push({ key: 'item_samosa', weight: 6 })
  if (cart.doshaCount >= 2) candidateKeys.push({ key: 'item_dosha', weight: 6 })
  if (cart.pokkavadaCount >= 2) candidateKeys.push({ key: 'item_pokkavada', weight: 6 })
  if (cart.boiledeggCount >= 2) candidateKeys.push({ key: 'item_boiledegg', weight: 6 })
  if (cart.bullseyeCount >= 1) candidateKeys.push({ key: 'item_bullseye', weight: 5 })
  if (cart.puffsCount >= 1) candidateKeys.push({ key: 'item_puffs', weight: 5 })
  if (cart.parippvadaCount >= 1) candidateKeys.push({ key: 'item_parippvada', weight: 5 })
  if (cart.passpassCount >= 1) candidateKeys.push({ key: 'item_passpass', weight: 5 })
  if (cart.coffeeCount >= 1) candidateKeys.push({ key: 'item_coffee', weight: 4 })
  if (cart.teaCount >= 1) candidateKeys.push({ key: 'item_chaya', weight: 4 })

  // --- Priority 3: Quantity & Tiny Bill Extremes ---
  if (cart.totalQuantity === 1) {
    candidateKeys.push({ key: 'single_item', weight: 6 })
  }
  if (cart.totalBill === 10) {
    candidateKeys.push({ key: 'bill_exact_10', weight: 7 })
  } else if (cart.totalBill < 15 && cart.totalQuantity > 0) {
    candidateKeys.push({ key: 'bill_under_15', weight: 5 })
  }

  // --- Priority 4: Bill & Spend Tiers (Adjusted to avoid overlap conflicts) ---
  if (cart.totalBill >= 15 && cart.totalBill <= 25) {
    candidateKeys.push({ key: 'normal_average', weight: 4 })
  } else if (cart.totalBill > 25 && cart.totalBill <= 30) {
    candidateKeys.push({ key: 'bill_20_30', weight: 4 })
  } else if (cart.totalBill > 30 && cart.totalBill <= 50) {
    candidateKeys.push({ key: 'bill_30_50', weight: 4 })
  } else if (cart.totalBill > 50) {
    candidateKeys.push({ key: 'bill_over_50', weight: 6 })
  }

  // Fallback if no specific condition matched
  if (candidateKeys.length === 0) {
    if (cart.totalBill > 50) {
      candidateKeys.push({ key: 'bill_over_50', weight: 1 })
    } else {
      candidateKeys.push({ key: 'normal_average', weight: 1 })
    }
  }

  // Weighted random selection among all matched conditions
  const totalWeight = candidateKeys.reduce((acc, c) => acc + c.weight, 0)
  let randomWeight = Math.random() * totalWeight
  let chosenKey = candidateKeys[0].key

  for (const c of candidateKeys) {
    if (randomWeight < c.weight) {
      chosenKey = c.key
      break
    }
    randomWeight -= c.weight
  }

  const alertEntry = MALAYALAM_ALERTS[chosenKey] || MALAYALAM_ALERTS.normal_average
  // Randomly select alert 1, 2, or 3
  const randomAlertIndex = Math.floor(Math.random() * 3)
  const alertNumber = (randomAlertIndex + 1) as 1 | 2 | 3

  return {
    conditionKey: chosenKey,
    category: alertEntry.category,
    reasonMalayalam: alertEntry.reasonMalayalam,
    text: alertEntry.alerts[randomAlertIndex],
    alertNumber
  }
}

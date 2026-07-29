const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { GoalNear, GoalFollow } = goals
const Groq = require('groq-sdk')

const config = {
  host: 'covrussmp.redstone.tr',
  port: 25590,
  username: 'MisotyBot',
  version: '1.21.1',
  owner: 'Misoty',
  groqApiKey: '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',
  password: 'Egecan11'
}

const groq = new Groq({ apiKey: config.groqApiKey })
const sohbetGecmisi = []

async function claudeYanit(mesaj) {
  sohbetGecmisi.push({ role: 'user', content: mesaj })
  if (sohbetGecmisi.length > 20) sohbetGecmisi.splice(0, 2)

  const yanit = await groq.chat.completions.create({
    model: 'llama3-8b-8192',
    max_tokens: 150,
    messages: [
      {
        role: 'system',
        content: `Sen "MisotyBot" adında eğlenceli bir Minecraft botusun. Sahibin Misoty. Kısa ve samimi Türkçe cevaplar ver. Cevapların 200 karakteri geçmesin.`
      },
      ...sohbetGecmisi
    ]
  })

  const metin = yanit.choices[0].message.content
  sohbetGecmisi.push({ role: 'assistant', content: metin })
  return metin
}

const bot = mineflayer.createBot(config)
bot.loadPlugin(pathfinder)

let collecting = false
let attacking = false
let attackInterval = null
let registered = false

// =============================
//   OTOMATİK KAYIT / GİRİŞ
// =============================
bot.on('message', (jsonMsg) => {
  const msg = jsonMsg.toString().toLowerCase()
  if (msg.includes('register') || msg.includes('kayıt') || msg.includes('/register')) {
    if (!registered) {
      setTimeout(() => {
        bot.chat(`/register ${config.password} ${config.password}`)
        registered = true
        console.log('📝 /register gönderildi')
      }, 1000)
    }
  }
  if (msg.includes('login') || msg.includes('giriş') || msg.includes('/login') || msg.includes('please login')) {
    setTimeout(() => {
      bot.chat(`/login ${config.password}`)
      console.log('🔑 /login gönderildi')
    }, 1000)
  }
})

bot.on('spawn', () => {
  console.log('✅ Bot bağlandı!')
  setTimeout(() => { bot.chat(`/login ${config.password}`) }, 2000)
  setTimeout(() => autoArmor(), 3000)
})

// =============================
//   AUTO TOTEM
// =============================
bot.on('health', () => {
  autoTotem()
})

function autoTotem() {
  const offhand = bot.inventory.slots[45]
  if (offhand && offhand.name === 'totem_of_undying') return

  const totem = bot.inventory.items().find(item => item.name === 'totem_of_undying')
  if (!totem) return

  bot.equip(totem, 'off-hand').catch(() => {})
}

// =============================
//   AUTO ARMOR
// =============================
async function autoArmor() {
  const armorSlots = {
    'head': ['netherite_helmet', 'diamond_helmet', 'iron_helmet', 'golden_helmet', 'chainmail_helmet', 'leather_helmet'],
    'torso': ['netherite_chestplate', 'diamond_chestplate', 'iron_chestplate', 'golden_chestplate', 'chainmail_chestplate', 'leather_chestplate'],
    'legs': ['netherite_leggings', 'diamond_leggings', 'iron_leggings', 'golden_leggings', 'chainmail_leggings', 'leather_leggings'],
    'feet': ['netherite_boots', 'diamond_boots', 'iron_boots', 'golden_boots', 'chainmail_boots', 'leather_boots'],
  }

  for (const [slot, items] of Object.entries(armorSlots)) {
    for (const itemName of items) {
      const item = bot.inventory.items().find(i => i.name === itemName)
      if (item) {
        try {
          await bot.equip(item, slot)
          console.log(`🛡️ \( {itemName} giyildi ( \){slot})`)
          break
        } catch (e) {}
      }
    }
  }
}

// =============================
//   MESAJ DİNLEYİCİ
// =============================
bot.on('chat', async (username, message) => {
  if (username === bot.username) return
  if (username !== config.owner) return
  const msg = message.trim()

  if (msg.startsWith('!')) {
    const args = msg.slice(1).trim().split(' ')
    const komut = args[0].toLowerCase()

    switch (komut) {

      case 'topla':
        if (!args[1]) { bot.chat('Kullanım: !topla <kaynak>'); break }
        topla(args[1]); break

      case 'dur':
        collecting = false; attacking = false
        clearInterval(attackInterval)
        bot.pathfinder.stop()
        bot.chat('Durdum.'); break

      case 'saldır': case 'saldir':
        if (!args[1]) { bot.chat('Kullanım: !saldır <oyuncu>'); break }
        saldır(args[1]); break

      case 'gel': {
        const p = bot.players[username]
        if (!p?.entity) { bot.chat('Seni göremiyorum!'); break }
        bot.chat('Geliyorum!')
        bot.pathfinder.setMovements(new Movements(bot))
        bot.pathfinder.setGoal(new GoalNear(p.entity.position.x, p.entity.position.y, p.entity.position.z, 2))
        break
      }

      case 'takip': {
        const hedefAdi = args[1] || username
        const hp = bot.players[hedefAdi]
        if (!hp?.entity) { bot.chat(`${hedefAdi} bulunamadı!`); break }
        bot.chat(`${hedefAdi} takip ediyorum!`)
        bot.pathfinder.setMovements(new Movements(bot))
        bot.pathfinder.setGoal(new GoalFollow(hp.entity, 3), true); break
      }

      case 'envanter': {
        const items = bot.inventory.items()
        bot.chat(items.length === 0 ? 'Envanterim boş.' : 'Envanter: ' + items.map(i => `\( {i.name} x \){i.count}`).join(', '))
        break
      }

      case 'tpa':
        bot.chat(`/tpa ${config.owner}`)
        bot.chat(`${config.owner} adlı oyuncuya TPA isteği attım!`)
        break

      case 'tpahere':
        bot.chat(`/tpahere ${config.owner}`)
        bot.chat(`${config.owner} adlı oyuncuya TPAHERE isteği attım!`)
        break

      case 'zırh': case 'zirh':
        await autoArmor()
        bot.chat('Zırhları giydim!')
        break

      case 'totem':
        autoTotem()
        bot.chat('Totemi offhand\'a aldım!')
        break

      case 'sıfırla': case 'sifirla':
        sohbetGecmisi.length = 0
        bot.chat('Sohbet hafızamı temizledim!'); break

      case 'yardım': case 'yardim':
        bot.chat('Komutlar: !topla | !saldır | !takip | !gel | !tpa | !tpahere | !zırh | !totem | !envanter | !dur | !sıfırla')
        break

      default:
        try {
          const yanit = await claudeYanit(msg.slice(1).trim())
          bot.chat(yanit.length <= 256 ? yanit : yanit.substring(0, 253) + '...')
        } catch (e) { bot.chat('Bir şey söyleyecektim ama unuttum...') }
    }
    return
  }

  // ! yoksa → sohbet
  try {
    const yanit = await claudeYanit(msg)
    bot.chat(yanit.length <= 256 ? yanit : yanit.substring(0, 253) + '...')
  } catch (e) { bot.chat('Bir şey söyleyecektim ama unuttum...') }
})

// =============================
//   KAYNAK TOPLAMA
// =============================
async function topla(kaynak) {
  const kaynakMap = {
    'odun': ['oak_log', 'birch_log', 'spruce_log', 'jungle_log', 'acacia_log', 'dark_oak_log', 'mangrove_log'],
    'taş': ['stone', 'cobblestone'], 'kömür': ['coal_ore', 'deepslate_coal_ore'],
    'demir': ['iron_ore', 'deepslate_iron_ore'], 'altın': ['gold_ore', 'deepslate_gold_ore'],
    'elmas': ['diamond_ore', 'deepslate_diamond_ore'], 'redstone': ['redstone_ore', 'deepslate_redstone_ore'],
    'lapis': ['lapis_ore', 'deepslate_lapis_ore'], 'toprak': ['dirt', 'grass_block'],
    'kum': ['sand'], 'çakıl': ['gravel'],
  }
  const bloklar = kaynakMap[kaynak.toLowerCase()]
  if (!bloklar) { bot.chat(`"${kaynak}" tanımıyorum. Bilinen: ${Object.keys(kaynakMap).join(', ')}`); return }
  collecting = true
  bot.chat(`${kaynak} toplamaya başlıyorum!`)
  while (collecting) {
    let hedefBlok = null
    for (const blokAdi of bloklar) {
      const b = bot.findBlock({ matching: bot.registry.blocksByName[blokAdi]?.id, maxDistance: 32 })
      if (b) { hedefBlok = b; break }
    }
    if (!hedefBlok) { bot.chat(`Yakında ${kaynak} bulamadım.`); collecting = false; break }
    try {
      await bot.pathfinder.goto(new GoalNear(hedefBlok.position.x, hedefBlok.position.y, hedefBlok.position.z, 1))
      await bot.dig(hedefBlok)
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200))
  }
}

// =============================
//   SALDIRI
// =============================
function saldır(hedefAdi) {
  attacking = false; clearInterval(attackInterval)
  if (!bot.players[hedefAdi]?.entity) { bot.chat(`${hedefAdi} bulunamadı!`); return }
  bot.chat(`${hedefAdi} saldırıyorum!`)
  attacking = true
  bot.pathfinder.setMovements(new Movements(bot))
  attackInterval = setInterval(() => {
    if (!attacking) { clearInterval(attackInterval); return }
    const hedef = bot.players[hedefAdi]?.entity
    if (!hedef) { bot.chat(`${hedefAdi} kayboldu.`); attacking = false; clearInterval(attackInterval); return }
    bot.pathfinder.setGoal(new GoalNear(hedef.position.x, hedef.position.y, hedef.position.z, 2), true)
    if (bot.entity.position.distanceTo(hedef.position) <= 3.5) bot.attack(hedef)
  }, 500)
}

// =============================
//   HATALAR
// =============================
bot.on('error', err => console.log('❌ Hata:', err))
bot.on('end', () => {
  console.log('🔌 Bağlantı kesildi, yeniden bağlanılıyor...')
  registered = false
  setTimeout(() => process.exit(1), 5000)
})

// =============================
//   GUI LOGIN (Ekranlı giriş)
// =============================
bot.on('windowOpen', async (window) => {
  const title = JSON.stringify(window.title || '').toLowerCase()
  console.log('Pencere acildi:', title)

  if (
    title.includes('login') ||
    title.includes('password') ||
    title.includes('sifre') ||
    title.includes('giris') ||
    title.includes('auth')
  ) {
    console.log('GUI login ekrani tespit edildi!')
    await new Promise(r => setTimeout(r, 800))

    bot.chat('/login ' + config.password)

    for (let i = 0; i < window.slots.length; i++) {
      if (window.slots[i]) {
        try {
          await bot.clickWindow(i, 0, 0)
          await new Promise(r => setTimeout(r, 200))
          break
        } catch (e) {}
      }
    }
  }

  if (String(window.type).includes('anvil')) {
    console.log('Anvil GUI tespit edildi!')
    await new Promise(r => setTimeout(r, 800))
    try { await bot.clickWindow(2, 0, 0) } catch(e) {}
  }
})

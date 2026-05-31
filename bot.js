const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { GoalNear, GoalFollow } = goals
const Anthropic = require('@anthropic-ai/sdk')

const config = {
  host: 'mc.quiltanarchy.xyz',
  port: 25565,
  username: 'MisotyBot',
  version: '1.20.1',
  owner: 'Misoty',
  anthropicApiKey: 'ANTHROPIC_API_KEY_BURAYA',
  password: 'Egecan11'
}

const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
const sohbetGecmisi = []

async function claudeYanit(mesaj) {
  // API key kontrolü
  if (!config.anthropicApiKey || config.anthropicApiKey === 'ANTHROPIC_API_KEY_BURAYA') {
    return 'Konuşmak isterdim ama API key ayarlı değil!'
  }
  sohbetGecmisi.push({ role: 'user', content: mesaj })
  if (sohbetGecmisi.length > 20) sohbetGecmisi.splice(0, 2)
  const yanit = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    system: `Sen "MisotyBot" adında eğlenceli bir Minecraft botusun. Sahibin Misoty. Kısa ve samimi Türkçe cevaplar ver. Cevapların 200 karakteri geçmesin.`,
    messages: sohbetGecmisi
  })
  const metin = yanit.content[0].text
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
//   TAKILMA ÖNLEME — OTOMATİK ZIPLA
// =============================
let lastPos = null
let stuckTicks = 0

setInterval(() => {
  if (!bot.entity) return
  const pos = bot.entity.position
  if (lastPos) {
    const dist = pos.distanceTo(lastPos)
    const isMoving = bot.pathfinder.isMoving ? bot.pathfinder.isMoving() : true
    if (isMoving && dist < 0.05) {
      stuckTicks++
      if (stuckTicks >= 3) {
        // Takıldı — zıpla ve küçük random hareket
        bot.setControlState('jump', true)
        setTimeout(() => bot.setControlState('jump', false), 400)
        // Rastgele yön
        const yaw = Math.random() * Math.PI * 2
        bot.entity.yaw = yaw
        bot.setControlState('forward', true)
        setTimeout(() => bot.setControlState('forward', false), 600)
        stuckTicks = 0
        console.log('⚠️ Takıldı, zıplandı')
      }
    } else {
      stuckTicks = 0
    }
  }
  lastPos = pos.clone()
}, 1000)

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

  // Pathfinder hareketlerini optimize et
  const defaultMov = new Movements(bot)
  defaultMov.canDig = false         // Kazma kapatıldı (takılmayı azaltır)
  defaultMov.allowParkour = true    // Parkur açık
  defaultMov.allowSprinting = true  // Koşma açık
  defaultMov.maxDropDown = 4        // 4 blok aşağı inebilir
  bot.pathfinder.setMovements(defaultMov)
})

// =============================
//   AUTO TOTEM
// =============================
bot.on('health', () => { autoTotem() })

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
        try { await bot.equip(item, slot); console.log(`🛡️ ${itemName} giyildi (${slot})`); break } catch (e) {}
      }
    }
  }
}

// =============================
//   ÇERÇEVE DUPE
// =============================
let dupeCalisiyor = false

async function cerceveDupe() {
  if (dupeCalisiyor) { bot.chat('Dupe zaten çalışıyor!'); return }

  const cerceve = bot.findBlock({
    matching: (b) => b.name === 'item_frame' || b.name === 'glow_item_frame',
    maxDistance: 6
  })
  if (!cerceve) { bot.chat('Yakında item frame bulamadım!'); return }

  dupeCalisiyor = true
  try {
    await bot.lookAt(cerceve.position.offset(0.5, 0.5, 0.5))
    await new Promise(r => setTimeout(r, 150))

    // Çerçeveye koy
    await bot.activateBlock(cerceve)
    await new Promise(r => setTimeout(r, 300))

    // Çerçeveden çıkar
    await bot.activateBlock(cerceve)
  } catch (e) {
    console.log('Dupe hatası:', e.message)
  } finally {
    dupeCalisiyor = false
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
        const mov = new Movements(bot)
        mov.allowParkour = true; mov.allowSprinting = true
        bot.pathfinder.setMovements(mov)
        bot.pathfinder.setGoal(new GoalNear(p.entity.position.x, p.entity.position.y, p.entity.position.z, 2))
        break
      }

      case 'takip': {
        const hedefAdi = args[1] || username
        const hp = bot.players[hedefAdi]
        if (!hp?.entity) { bot.chat(`${hedefAdi} bulunamadı!`); break }
        bot.chat(`${hedefAdi} takip ediyorum!`)
        const mov = new Movements(bot)
        mov.allowParkour = true; mov.allowSprinting = true
        bot.pathfinder.setMovements(mov)
        bot.pathfinder.setGoal(new GoalFollow(hp.entity, 3), true); break
      }

      case 'envanter': {
        const items = bot.inventory.items()
        bot.chat(items.length === 0 ? 'Envanterim boş.' : 'Envanter: ' + items.map(i => `${i.name} x${i.count}`).join(', '))
        break
      }

      case 'tpa':
        bot.chat(`/tpa ${config.owner}`)
        bot.chat(`${config.owner} adlı oyuncuya TPA isteği attım!`)
        break

      case 'zırh': case 'zirh':
        await autoArmor()
        bot.chat('Zırhları giydim!')
        break

      case 'totem':
        autoTotem()
        bot.chat('Totemi offhand\'a aldım!')
        break

      // ÇERÇEVE DUPE
      case 'dupe': case 'cerceve': case 'çerçeve':
        await cerceveDupe()
        break

      case 'sıfırla': case 'sifirla':
        sohbetGecmisi.length = 0
        bot.chat('Sohbet hafızamı temizledim!'); break

      case 'yardım': case 'yardim':
        bot.chat('Komutlar: !topla | !saldır | !takip | !gel | !tpa | !zırh | !totem | !dupe | !envanter | !dur | !sıfırla')
        break

      default:
        try {
          const yanit = await claudeYanit(msg.slice(1).trim())
          bot.chat(yanit.length <= 256 ? yanit : yanit.substring(0, 253) + '...')
        } catch (e) {
          console.error('Claude hatası:', e.message)
          bot.chat('Hmm, şu an konuşamıyorum.')
        }
    }
    return
  }

  // ! yoksa → sohbet
  try {
    const yanit = await claudeYanit(msg)
    bot.chat(yanit.length <= 256 ? yanit : yanit.substring(0, 253) + '...')
  } catch (e) {
    console.error('Claude hatası:', e.message)
    bot.chat('Hmm, şu an konuşamıyorum.')
  }
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
  const mov = new Movements(bot)
  mov.allowParkour = true; mov.allowSprinting = true
  bot.pathfinder.setMovements(mov)
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

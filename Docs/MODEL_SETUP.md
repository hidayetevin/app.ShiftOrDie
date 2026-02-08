# Model Kurulum Talimatları

## Soldier.glb Modeli Nasıl İndirilir?

SHIFT OR DIE oyununun karakteri için Three.js'in resmi Soldier modelini kullanıyoruz.

### Adım 1: Modeli İndir
Aşağıdaki linkten `Soldier.glb` dosyasını indir:
**https://github.com/mrdoob/three.js/raw/dev/examples/models/gltf/Soldier.glb**

### Adım 2: Dosyayı Yerleştir
İndirdiğin `Soldier.glb` dosyasını şu klasöre kopyala:
```
d:\PROJECTS\app.ShiftOrDie\public\models\gltf\Soldier.glb
```

### Adım 3: Tarayıcıyı Yenile
Vite dev server çalışıyorken sayfayı yenile (F5). Model otomatik olarak yüklenecek.

---

## Alternatif Modeller

Eğer farklı bir karakter kullanmak istersen:

### Mixamo (Ücretsiz Animasyonlu Karakterler)
1. https://www.mixamo.com adresine git
2. Bir karakter seç (örn: Y Bot, X Bot)
3. "Download" butonuna tıkla
4. Format: **FBX for Unity** veya **GLB** seç
5. "With Skin" seçeneğini aktifleştir
6. İndir ve `Soldier.glb` yerine koy

### Ready Player Me (Özelleştirilebilir Avatarlar)
1. https://readyplayer.me adresine git
2. Kendi karakterini oluştur
3. GLB formatında indir
4. `Soldier.glb` yerine koy

Not: Eğer farklı bir model kullanırsan, `Player.js` dosyasındaki animasyon isimlerini (Idle, Walk, Run) modelin animasyon isimlerine göre güncellemelisin.

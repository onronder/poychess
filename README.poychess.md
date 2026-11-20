# PoyChess

Türkçe ve mobil uyumlu satranç platformu. React + Vinext / Cloudflare Workers, D1 ve chess.js kullanır.

## Oyun

- Bilgisayar rakibi: Web Worker içinde çalışan, üç seviyeli minimax / alfa-beta satranç motoru. Harici AI anahtarı gerekmez. Stockfish değildir; seviye isimleri resmî Elo puanı ifade etmez.
- Arkadaş maçı: 6 karakterli oda kodu ile iki cihaz. Sunucu hamleleri, oyuncu sırasını, saatleri ve sonuçları doğrular. İstemci yaklaşık 1,5 saniyede bir eşitlenir.
- Geri alma: arkadaş maçında istek gönderilir; rakip kabul edince son tek hamle geri alınır. Rakip reddedebilir, isteği gönderen iptal edebilir. Yeni hamle isteği iptal eder. Geçen süre geri verilmez, geri alınan hamlenin süre artışı çıkarılır. Bilgisayar maçında bot otomatik kabul eder ve son oyuncu/bot hamle çifti geri alınır.
- Botun açılış repertuvarı piyon, fil ve at gelişimini çeşitlendirir. Değerlendirme aynı taşı açılışta tekrar oynama eğilimini azaltır. Süre dolduğunda yalnızca tamamen aranmış derinliğin sonuçları kullanılır.
- Rok, geçerken alma, dört taş seçeneğiyle terfi, mat, pat, tekrar ve 50 hamle beraberliği.
- Dört açıklamalı taktik, temel satranç dersleri, hamle inceleme ve PGN indirme.
- Yerel bilgisayar oyunu, taktik ilerlemesi ve oyun geçmişi bu tarayıcıda saklanır. Çevrim içi oyun odaları D1'de 24 saat geçerlidir. Oyuncu erişim anahtarı sekme oturumunda tutulur; sayfa yenilenince oyun devam eder.

## İpucu paneli

Sol alttaki Özel erişim düğmesinden `7654321` kodunu girin. Her oyuncu, her maçta en çok 10 ipucu kullanabilir; iki kullanım arasında 20 saniye beklenir. Çevrim içi maçlarda sayaç ve bekleme sunucuda saklanır ve doğrulanır. Bilgisayar maçında tarayıcıda saklanır. İpucu sırasında önerilen başlangıç ve hedef kareler altın rengiyle işaretlenir. Üçüncü seviyedeki yerel motorun değerlendirmesidir; matematiksel olarak kusursuz hamle garantisi yoktur.

Aynı panelde **Vezirle taş atlama** sınırı 0–6 arasında ayarlanır. 0 standart satrançtır. Kendi veziri seçilen sayıya kadar dost veya rakip taşı geçebilir; atlanan taşlar yerinde kalır, yalnızca hedefteki rakip taş alınır. Dost taşın üstüne inilemez; şah güvenliği korunur. Her renk kendi sınırını belirler ve iki sınır da her iki oyuncuya gösterilir. Ayar yalnızca kendi sıranda (veya odada beklerken) değişir; hamle yapmadan rakibe şah çektiren ayar reddedilir. Taktikler standart kuralları kullanır. Bot ve ipucu motoru özel kurala uyar. Her hamle kendi kural ayarını saklar; geri alma o hamleden önceki ayarı da geri getirir. Bu maçların PGN dosyaları `PoyChess Queen Jump` varyantı olarak etiketlenir; standart PGN okuyucuları atlama hamlelerini desteklemeyebilir.

## Çalıştırma

Node.js 24 önerilir.

```sh
npm ci
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_powerful_triton.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_funny_norrin_radd.sql
npm run dev -- --hostname 127.0.0.1
```

Yerel adres: http://127.0.0.1:5173. Mobil cihazdan uzaktaki yayımlanmış URL kullanılmalıdır. Sites yeni projeyi özel erişimle yayımlar; farklı hesaplardan ziyaret için site paylaşım ayarı ayrıca açılmalıdır. Yerel önizlemenin veritabanı yayımlanan sitenin veritabanından ayrıdır.

## Doğrulama

```sh
npx tsc --noEmit
node --test tests/rules.test.mjs
node --test tests/rooms.test.mjs
```

Oda testleri çalışan 127.0.0.1:5173 sunucusunu ve yerel D1 veritabanını kullanır. Kota ve saat sınır durumlarını hızlı test etmek için yalnızca oluşturduğu test odalarının yerel kayıtlarını düzenler. Üretim sunucusunda çalışmaz.

`public/chess.js`, chess.js 1.4.0 üzerine vezir atlama desteği eklenmiş yerel türevdir. Lisansı `public/chess-LICENSE` dosyasındadır. Üzerine node_modules kopyalamayın; sürüm yükseltirken `setQueenJumpLimits`, saldırı ışını ve hamle üretimi değişikliklerini koruyup testleri çalıştırın. İstemci, sunucu ve motor aynı türevi kullanır. Taş SVG'leri uygulamaya özeldir.

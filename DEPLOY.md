# Dunya Kupasi Tahmin - Deploy Rehberi

## Hizli Baslangic (Yerel)

```bash
npm install
npm run seed    # admin + ornek maclar olusturur
npm start       # http://localhost:3000
```

## Railway ile Deploy (Ucretsiz - Onerilen)

### 1. GitHub'a yukle
```bash
git init
git add .
git commit -m "Dunya Kupasi Tahmin Uygulamasi"
```
GitHub'da yeni repo olustur ve push et:
```bash
git remote add origin https://github.com/KULLANICI/worldcup-predictor.git
git branch -M main
git push -u origin main
```

### 2. Railway'e deploy et
1. https://railway.app adresine git, GitHub ile giris yap
2. "New Project" > "Deploy from GitHub Repo" tikla
3. Repoyu sec
4. Railway otomatik olarak `npm install` ve `npm start` calistiracak
5. Settings > Environment Variables'a gir:
   - `JWT_SECRET` = rastgele uzun bir metin (orn: `benim-gizli-anahtarim-2026-xyz`)
6. Settings > Networking > "Generate Domain" tikla (ucretsiz .up.railway.app domain verir)

### 3. Seed calistir
Railway dashboard > projenin icinde terminal ac:
```bash
node seed.js
```

### 4. Hazir!
Railway'in verdigi URL'yi (orn: worldcup-predictor.up.railway.app) arkadaslarinla paylas.

## Render ile Deploy (Alternatif)

1. https://render.com > "New Web Service"
2. GitHub repoyu bagla
3. Build Command: `npm install`
4. Start Command: `npm start`
5. Environment: `JWT_SECRET=rastgele-gizli-anahtar`

## Hesaplar

| Rol | E-posta | Sifre |
|-----|---------|-------|
| Admin | admin@worldcup.com | admin123 |
| Admin | alpertini@gmail.com | admin123 |
| Test | test@worldcup.com | test123 |

> Onemli: Deploy sonrasi admin sifrelerini degistirin!

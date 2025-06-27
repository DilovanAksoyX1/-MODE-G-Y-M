const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const sql = require('mssql');
require('dotenv').config();

console.log('Server başlatılıyor...');
console.log('Çevre değişkenleri yüklendi.');

const app = express();
const port = process.env.PORT || 3000;

// SQL Server bağlantı bilgileri
const sqlConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'MODE_DB',
  server: process.env.DB_SERVER || 'localhost',
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

console.log('Veritabanı yapılandırması:');
console.log('Server:', sqlConfig.server);
console.log('Database:', sqlConfig.database);
console.log('User:', sqlConfig.user);

// Middleware ayarları
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'mode-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 saat
}));

// Eksik resim yönetimi - geçici çözüm
app.use((req, res, next) => {
  const filePath = req.path;
  // Resim dosyaları için 404 hatasını engelleme
  if (filePath.match(/\.(jpg|jpeg|png|gif)$/i)) {
    const fs = require('fs');
    const imagePath = path.join(__dirname, 'public', filePath);
    
    fs.access(imagePath, fs.constants.F_OK, (err) => {
      if (err) {
        // Eğer belirtilen resim dosyası yoksa, varsayılan resim dosyasını göster
        return res.sendFile(path.join(__dirname, 'public', 'images', 'placeholder.jpg'));
      }
      next();
    });
  } else {
    next();
  }
});

app.set('view engine', 'ejs');

// Veritabanı bağlantısı kurma
async function connectToDB() {
  try {
    console.log('SQL Server bağlantısı deneniyor...');
    await sql.connect(sqlConfig);
    console.log('SQL Server\'a bağlandı!');
    
    // Tabloları sadece yoksa oluştur
    // Kullanıcılar tablosunu oluşturma
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'users')
      BEGIN
        CREATE TABLE users (
          id INT PRIMARY KEY IDENTITY(1,1),
          email NVARCHAR(100) UNIQUE NOT NULL,
          password NVARCHAR(100) NOT NULL,
          name NVARCHAR(100) NOT NULL,
          surname NVARCHAR(100) NOT NULL,
          createdAt DATETIME DEFAULT GETDATE()
        )
      END
    `;

    // Ürünler tablosunu oluşturma
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'products')
      BEGIN
        CREATE TABLE products (
          id INT PRIMARY KEY IDENTITY(1,1),
          name NVARCHAR(200) NOT NULL,
          description NVARCHAR(MAX),
          price DECIMAL(10, 2) NOT NULL,
          discountedPrice DECIMAL(10, 2),
          category NVARCHAR(50) NOT NULL,
          imageUrl NVARCHAR(200),
          stock INT DEFAULT 100,
          isNew BIT DEFAULT 1,
          isOnSale BIT DEFAULT 0,
          createdAt DATETIME DEFAULT GETDATE()
        )
      END
    `;

    // Sepet tablosunu oluşturma
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'cart')
      BEGIN
        CREATE TABLE cart (
          id INT PRIMARY KEY IDENTITY(1,1),
          userId INT NOT NULL,
          productId INT NOT NULL,
          quantity INT DEFAULT 1,
          size NVARCHAR(10) DEFAULT 'M',
          createdAt DATETIME DEFAULT GETDATE(),
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (productId) REFERENCES products(id)
        )
      END
    `;

    // Wishlist tablosunu oluşturma
    await sql.query`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'wishlist')
      BEGIN
        CREATE TABLE wishlist (
          id INT PRIMARY KEY IDENTITY(1,1),
          userId INT NOT NULL,
          productId INT NOT NULL,
          createdAt DATETIME DEFAULT GETDATE(),
          FOREIGN KEY (userId) REFERENCES users(id),
          FOREIGN KEY (productId) REFERENCES products(id),
          UNIQUE(userId, productId)
        )
      END
    `;

    // Ürün tablosu boşsa örnek ürünleri ekle
    const result = await sql.query`SELECT COUNT(*) as count FROM products`;
    if (result.recordset[0].count === 0) {
      await addSampleProducts();
    }

    console.log('Veritabanı tabloları kontrol edildi ve gerekli düzenlemeler yapıldı');
    return true;
  } catch (err) {
    console.error('Veritabanı bağlantısı başarısız:', err);
    return false;
  }
}

// Örnek ürünleri ekleyen fonksiyon
async function addSampleProducts() {
  try {
    // Örnek ürün verileri
    const products = [
        // Kadın T-shirt'ler
        {
            name: 'Kadın Basic T-shirt',
            description: 'Günlük kullanım için rahat pamuklu basic t-shirt',
            price: 149.99,
            category: 'women',
            imageUrl: '/images/women-tshirt1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Kadın V Yaka T-shirt',
            description: 'Şık V yaka detaylı pamuklu t-shirt',
            price: 169.99,
            category: 'women',
            imageUrl: '/images/women-tshirt2.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Kadın Oversize T-shirt',
            description: 'Rahat kesim oversize model t-shirt',
            price: 199.99,
            category: 'women',
            imageUrl: '/images/women-tshirt3.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 159.99
        },
        
        // Kadın Sweatshirt'ler
        {
            name: 'Kadın Kapüşonlu Sweatshirt',
            description: 'Yumuşak dokulu kapüşonlu sweatshirt',
            price: 299.99,
            category: 'women',
            imageUrl: '/images/women-sweatshirt1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Kadın Fermuarlı Sweatshirt',
            description: 'Spor tarzı fermuarlı sweatshirt',
            price: 349.99,
            category: 'women',
            imageUrl: '/images/women-sweatshirt2.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 279.99
        },
        
        // Kadın Eşofmanlar
        {
            name: 'Kadın Jogger Eşofman',
            description: 'Rahat kesim jogger eşofman altı',
            price: 249.99,
            category: 'women',
            imageUrl: '/images/women-jogger1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Kadın Paçası Lastikli Eşofman',
            description: 'Paçası lastikli rahat eşofman altı',
            price: 229.99,
            category: 'women',
            imageUrl: '/images/women-jogger2.jpg',
            isNew: true,
            isOnSale: false
        },
        
        // Kadın Eşofman Takımları
        {
            name: 'Kadın Kapüşonlu Eşofman Takımı',
            description: 'Kapüşonlu üst ve eşofman altından oluşan takım',
            price: 449.99,
            category: 'women',
            imageUrl: '/images/women-tracksuit1.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 399.99
        },
        {
            name: 'Kadın Fermuarlı Eşofman Takımı',
            description: 'Fermuarlı üst ve eşofman altından oluşan şık takım',
            price: 499.99,
            category: 'women',
            imageUrl: '/images/women-tracksuit2.jpg',
            isNew: true,
            isOnSale: false
        },
        
        // Kadın Etekler
        {
            name: 'Kadın Mini Etek',
            description: 'Şık ve modern mini etek',
            price: 279.99,
            category: 'women',
            imageUrl: '/images/women-skirt1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Kadın Pileli Etek',
            description: 'Zarif pileli midi etek',
            price: 329.99,
            category: 'women',
            imageUrl: '/images/women-skirt2.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 279.99
        },
        
        // Kadın Pantolonlar
        {
            name: 'Kadın Yüksek Bel Jean',
            description: 'Yüksek bel skinny jean pantolon',
            price: 349.99,
            category: 'women',
            imageUrl: '/images/women-pants1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Kadın Kumaş Pantolon',
            description: 'Şık ve rahat kumaş pantolon',
            price: 299.99,
            category: 'women',
            imageUrl: '/images/women-pants2.jpg',
            isNew: true,
            isOnSale: false
        },
        
        // Kadın Şortlar
        {
            name: 'Kadın Jean Şort',
            description: 'Rahat kesim jean şort',
            price: 199.99,
            category: 'women',
            imageUrl: '/images/women-shorts1.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 159.99
        },
        {
            name: 'Kadın Spor Şort',
            description: 'Spor aktiviteler için tasarlanmış şort',
            price: 179.99,
            category: 'women',
            imageUrl: '/images/women-shorts2.jpg',
            isNew: true,
            isOnSale: false
        },
        
        // Erkek ürünleri
        {
            name: 'Erkek Basic T-shirt',
            description: 'Günlük kullanım için rahat pamuklu basic t-shirt',
            price: 149.99,
            category: 'men',
            imageUrl: '/images/men-tshirt1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Erkek Polo Yaka T-shirt',
            description: 'Şık polo yaka pamuklu t-shirt',
            price: 199.99,
            category: 'men',
            imageUrl: '/images/men-tshirt2.jpg',
            isNew: true,
            isOnSale: false
        },
        
        // Yeni Erkek Ürünleri
        {
            name: 'Erkek Slim Fit Jean',
            description: 'Modern kesim slim fit jean pantolon',
            price: 399.99,
            category: 'men',
            imageUrl: '/images/men-pants1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Erkek Kargo Pantolon',
            description: 'Çok cepli rahat kesim kargo pantolon',
            price: 349.99,
            category: 'men',
            imageUrl: '/images/men-pants2.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 299.99
        },
        {
            name: 'Erkek Kapüşonlu Sweatshirt',
            description: 'Kalın kumaşlı kışlık kapüşonlu sweatshirt',
            price: 299.99,
            category: 'men',
            imageUrl: '/images/men-sweatshirt1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Erkek Fermuarlı Sweatshirt',
            description: 'Spor tarzı fermuarlı sweatshirt',
            price: 329.99,
            category: 'men',
            imageUrl: '/images/men-sweatshirt2.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 279.99
        },
        {
            name: 'Erkek Denim Ceket',
            description: 'Klasik kesim denim ceket',
            price: 499.99,
            category: 'men',
            imageUrl: '/images/men-jacket1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Erkek Bomber Ceket',
            description: 'Modern tarz bomber ceket',
            price: 599.99,
            category: 'men',
            imageUrl: '/images/men-jacket2.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 499.99
        },
        {
            name: 'Erkek Spor Şort',
            description: 'Hafif ve nefes alabilir spor şort',
            price: 199.99,
            category: 'men',
            imageUrl: '/images/men-shorts1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Erkek Deniz Şortu',
            description: 'Hızlı kuruyan deniz şortu',
            price: 179.99,
            category: 'men',
            imageUrl: '/images/men-shorts2.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 149.99
        },
        
        // Aksesuar Ürünleri
        {
            name: 'Deri Cüzdan',
            description: 'Hakiki deri erkek cüzdanı',
            price: 299.99,
            category: 'accessories',
            imageUrl: '/images/acc-wallet1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Kartlık',
            description: 'İnce tasarım deri kartlık',
            price: 199.99,
            category: 'accessories',
            imageUrl: '/images/acc-wallet2.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 169.99
        },
        {
            name: 'Spor Çanta',
            description: 'Dayanıklı spor ve seyahat çantası',
            price: 399.99,
            category: 'accessories',
            imageUrl: '/images/acc-bag1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Sırt Çantası',
            description: 'Modern tasarım laptop bölmeli sırt çantası',
            price: 449.99,
            category: 'accessories',
            imageUrl: '/images/acc-bag2.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 379.99
        },
        {
            name: 'Deri Kemer',
            description: 'Klasik tasarım hakiki deri kemer',
            price: 249.99,
            category: 'accessories',
            imageUrl: '/images/acc-belt1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Örgü Kemer',
            description: 'Casual tarz örgü kemer',
            price: 199.99,
            category: 'accessories',
            imageUrl: '/images/acc-belt2.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 169.99
        },
        {
            name: 'Güneş Gözlüğü',
            description: 'UV korumalı modern tasarım güneş gözlüğü',
            price: 599.99,
            category: 'accessories',
            imageUrl: '/images/acc-sunglasses1.jpg',
            isNew: true,
            isOnSale: false
        },
        {
            name: 'Spor Güneş Gözlüğü',
            description: 'Sporcu tasarımı güneş gözlüğü',
            price: 499.99,
            category: 'accessories',
            imageUrl: '/images/acc-sunglasses2.jpg',
            isNew: true,
            isOnSale: true,
            discountedPrice: 429.99
        }
    ];

    // Ürünleri veritabanına ekle
    for (const product of products) {
      await sql.query`
        INSERT INTO products (name, description, price, discountedPrice, category, imageUrl, isNew, isOnSale) 
        VALUES (${product.name}, ${product.description}, ${product.price}, ${product.discountedPrice || null}, ${product.category}, ${product.imageUrl}, ${product.isNew || 0}, ${product.isOnSale || 0})
      `;
    }

    console.log('Örnek ürünler eklendi');
  } catch (err) {
    console.error('Örnek ürün ekleme hatası:', err);
  }
}

// Veritabanında ürün resimlerini güncellemek için bir script ekleyelim
async function updateProductImages() {
  try {
    await sql.query`
      UPDATE products SET imageUrl = '/images/product1.jpg' WHERE name = N'Kadın Triko Kazak';
      UPDATE products SET imageUrl = '/images/product2.jpg' WHERE name = N'Kadın Deri Ceket';
      UPDATE products SET imageUrl = '/images/product3.jpg' WHERE name = N'Kadın Kot Pantolon';
      UPDATE products SET imageUrl = '/images/product4.jpg' WHERE name = N'Kadın Bluz';
      
      UPDATE products SET imageUrl = '/images/product5.jpg' WHERE name = N'Erkek Gömlek';
      UPDATE products SET imageUrl = '/images/product6.jpg' WHERE name = N'Erkek Ceket';
      UPDATE products SET imageUrl = '/images/product7.jpg' WHERE name = N'Erkek Kot Pantolon';
      UPDATE products SET imageUrl = '/images/product8.jpg' WHERE name = N'Erkek Sweatshirt';
      
      UPDATE products SET imageUrl = '/images/product9.jpg' WHERE name = N'Deri Cüzdan';
      UPDATE products SET imageUrl = '/images/product10.jpg' WHERE name = N'Kol Saati';
      UPDATE products SET imageUrl = '/images/product11.jpg' WHERE name = N'Güneş Gözlüğü';
      UPDATE products SET imageUrl = '/images/product12.jpg' WHERE name = N'Deri Kemer';
      
      UPDATE products SET imageUrl = '/images/product13.jpg' WHERE name = N'Deri Ceket';
      UPDATE products SET imageUrl = '/images/product14.jpg' WHERE name = N'Kış Botu';
      UPDATE products SET imageUrl = '/images/product15.jpg' WHERE name = N'Yün Kazak';
      UPDATE products SET imageUrl = '/images/product16.jpg' WHERE name = N'Spor Ayakkabı';
    `;
    console.log('Ürün resimleri güncellendi');
  } catch (err) {
    console.error('Ürün resimleri güncelleme hatası:', err);
  }
}

// Ana sayfa
app.get('/', async (req, res) => {
  try {
    // Öne çıkan ürünleri getir (en son eklenen 8 ürün)
    const featuredProducts = await sql.query`
      SELECT TOP 8 * FROM products 
      ORDER BY createdAt DESC
    `;
    
    res.render('index', { 
      user: req.session.user || null,
      featuredProducts: featuredProducts.recordset
    });
  } catch (err) {
    console.error('Öne çıkan ürünleri getirme hatası:', err);
    res.render('index', { 
      user: req.session.user || null,
      featuredProducts: []
    });
  }
});

// İndirim sayfası
app.get('/indirim', async (req, res) => {
  console.log('İndirim kategorisi isteği alındı');
  try {
    const products = await sql.query`
      SELECT * FROM products 
      WHERE isOnSale = 1 OR discountedPrice IS NOT NULL
    `;
    console.log('Bulunan indirimli ürün sayısı:', products.recordset.length);
    res.render('sale', { 
      user: req.session.user || null,
      products: products.recordset
    });
  } catch (err) {
    console.error('İndirimli ürünleri getirme hatası:', err);
    res.render('sale', { 
      user: req.session.user || null,
      products: []
    });
  }
});

// Kadın kategorisi
app.get('/kadin', async (req, res) => {
  console.log('Kadın kategorisi isteği alındı');
  try {
    const products = await sql.query`
      SELECT * FROM products 
      WHERE category = 'women'
    `;
    console.log('Bulunan kadın ürün sayısı:', products.recordset.length);
    res.render('women', { 
      user: req.session.user || null,
      products: products.recordset
    });
  } catch (err) {
    console.error('Kadın ürünleri getirme hatası:', err);
    res.render('women', { 
      user: req.session.user || null,
      products: []
    });
  }
});

app.get('/erkek', async (req, res) => {
  console.log('Erkek kategorisi isteği alındı');
  try {
    const products = await sql.query`SELECT * FROM products WHERE category = 'men'`;
    res.render('men', { 
      user: req.session.user || null,
      products: products.recordset
    });
  } catch (err) {
    console.error('Erkek ürünleri getirme hatası:', err);
    res.render('men', { 
      user: req.session.user || null,
      products: []
    });
  }
});

app.get('/aksesuar', async (req, res) => {
  console.log('Aksesuar kategorisi isteği alındı');
  try {
    const products = await sql.query`SELECT * FROM products WHERE category = 'accessories'`;
    res.render('accessories', { 
      user: req.session.user || null,
      products: products.recordset
    });
  } catch (err) {
    console.error('Aksesuar ürünleri getirme hatası:', err);
    res.render('accessories', { 
      user: req.session.user || null,
      products: []
    });
  }
});

// Giriş sayfası
app.get('/login', (req, res) => {
  res.render('login', { 
    user: req.session.user || null,
    error: null, 
    success: null 
  });
});

// Giriş işlemi
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await sql.query`SELECT * FROM users WHERE email = ${email}`;
    
    if (result.recordset.length === 0) {
      return res.render('login', { 
        user: req.session.user || null,
        error: 'E-posta adresi bulunamadı', 
        success: null 
      });
    }

    const user = result.recordset[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.render('login', { 
        user: req.session.user || null,
        error: 'Hatalı şifre', 
        success: null 
      });
    }

    // Kullanıcı bilgilerini session'a kaydet (şifre hariç)
    req.session.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname
    };

    res.redirect('/');
  } catch (err) {
    console.error('Giriş hatası:', err);
    res.render('login', { 
      user: req.session.user || null,
      error: 'Giriş yapılırken bir hata oluştu', 
      success: null 
    });
  }
});

// Kayıt sayfası
app.get('/register', (req, res) => {
  res.render('register', { error: null, success: null });
});

// Kayıt işlemi
app.post('/register', async (req, res) => {
  const { name, surname, email, password } = req.body;

  try {
    // E-posta kontrolü
    const checkResult = await sql.query`SELECT * FROM users WHERE email = ${email}`;
    
    if (checkResult.recordset.length > 0) {
      return res.render('register', { 
        error: 'Bu e-posta adresi zaten kullanılıyor', 
        success: null 
      });
    }

    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);

    // Kullanıcıyı kaydet
    await sql.query`
      INSERT INTO users (name, surname, email, password) 
      VALUES (${name}, ${surname}, ${email}, ${hashedPassword})
    `;

    res.render('login', { 
      error: null, 
      success: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.' 
    });
  } catch (err) {
    console.error('Kayıt hatası:', err);
    res.render('register', { 
      error: 'Kayıt sırasında bir hata oluştu', 
      success: null 
    });
  }
});

// Şifremi unuttum sayfası
app.get('/forgot-password', (req, res) => {
  res.render('forgot-password', { error: null, success: null });
});

// Şifremi unuttum işlemi (gerçek uygulamada e-posta gönderimi eklenebilir)
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const result = await sql.query`SELECT * FROM users WHERE email = ${email}`;
    
    if (result.recordset.length === 0) {
      return res.render('forgot-password', { 
        error: 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı', 
        success: null 
      });
    }

    // Gerçek uygulamada burada şifre sıfırlama bağlantısı e-posta ile gönderilir
    // Şimdilik sadece başarılı mesajı gösteriyoruz
    res.render('forgot-password', { 
      error: null, 
      success: 'Şifre sıfırlama talimatları e-posta adresinize gönderildi.' 
    });
  } catch (err) {
    console.error('Şifre sıfırlama hatası:', err);
    res.render('forgot-password', { 
      error: 'İşlem sırasında bir hata oluştu', 
      success: null 
    });
  }
});

// Çıkış yap
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Sepet işlemleri
app.post('/sepete-ekle', async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Sepete ürün eklemek için giriş yapmalısınız' });
  }

  try {
    const { productId, quantity, size } = req.body;
    
    // Ürün kontrolü
    const product = await sql.query`SELECT * FROM products WHERE id = ${productId}`;
    if (product.recordset.length === 0) {
      return res.json({ success: false, message: 'Ürün bulunamadı' });
    }
    
    // Sepette bu ürün var mı kontrol et
    const existingItem = await sql.query`
      SELECT * FROM cart 
      WHERE userId = ${req.session.user.id} AND productId = ${productId} AND size = ${size || 'M'}
    `;
    
    if (existingItem.recordset.length > 0) {
      // Varsa miktarı güncelle
      await sql.query`
        UPDATE cart 
        SET quantity = quantity + ${quantity} 
        WHERE userId = ${req.session.user.id} AND productId = ${productId} AND size = ${size || 'M'}
      `;
    } else {
      // Yoksa yeni ekle
      await sql.query`
        INSERT INTO cart (userId, productId, quantity, size) 
        VALUES (${req.session.user.id}, ${productId}, ${quantity}, ${size || 'M'})
      `;
    }
    
    res.json({ success: true, message: 'Ürün sepete eklendi' });
  } catch (err) {
    console.error('Sepete ekleme hatası:', err);
    res.json({ success: false, message: 'Bir hata oluştu' });
  }
});

app.get('/sepet', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const cartItems = await sql.query`
      SELECT c.id, c.quantity, c.size, p.id as productId, p.name, p.price, p.discountedPrice, p.imageUrl 
      FROM cart c
      JOIN products p ON c.productId = p.id
      WHERE c.userId = ${req.session.user.id}
    `;
    
    res.render('cart', { 
      user: req.session.user,
      cartItems: cartItems.recordset
    });
  } catch (err) {
    console.error('Sepet getirme hatası:', err);
    res.render('cart', { 
      user: req.session.user,
      cartItems: [],
      error: 'Sepet bilgileri alınırken bir hata oluştu'
    });
  }
});

app.post('/sepetten-cikar', async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'İşlem için giriş yapmalısınız' });
  }

  try {
    const { cartItemId } = req.body;
    
    await sql.query`
      DELETE FROM cart 
      WHERE id = ${cartItemId} AND userId = ${req.session.user.id}
    `;
    
    res.json({ success: true, message: 'Ürün sepetten çıkarıldı' });
  } catch (err) {
    console.error('Sepetten çıkarma hatası:', err);
    res.json({ success: false, message: 'Bir hata oluştu' });
  }
});

// Sepet ürün miktarı güncelleme endpoint'i
app.post('/sepet-guncelle', async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'İşlem için giriş yapmalısınız' });
  }

  try {
    const { cartItemId, quantity } = req.body;
    
    // Miktar 0'dan küçük olamaz
    if (quantity < 0) {
      return res.json({ success: false, message: 'Geçersiz miktar' });
    }
    
    if (quantity === 0) {
      // Miktar 0 ise ürünü sepetten kaldır
      await sql.query`
        DELETE FROM cart 
        WHERE id = ${cartItemId} AND userId = ${req.session.user.id}
      `;
    } else {
      // Miktarı güncelle
      await sql.query`
        UPDATE cart 
        SET quantity = ${quantity} 
        WHERE id = ${cartItemId} AND userId = ${req.session.user.id}
      `;
    }
    
    res.json({ success: true, message: 'Sepet güncellendi' });
  } catch (err) {
    console.error('Sepet güncelleme hatası:', err);
    res.json({ success: false, message: 'Bir hata oluştu' });
  }
});

// API endpoint to check if user is authenticated
app.get('/api/check-auth', (req, res) => {
  if (req.session.user) {
    res.json({ authenticated: true, user: { id: req.session.user.id, email: req.session.user.email } });
  } else {
    res.json({ authenticated: false });
  }
});

// API endpoint to add item to cart
app.post('/api/cart/add', async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ success: false, message: 'Giriş yapmalısınız' });
    }
    
    const { productId, quantity, size } = req.body;
    
    if (!productId || !quantity || !size) {
      return res.status(400).json({ success: false, message: 'Eksik bilgi' });
    }
    
    // Check if product exists
    const product = await sql.query`SELECT * FROM products WHERE id = ${productId}`;
    if (product.recordset.length === 0) {
      return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    }
    
    // Check if product is already in cart
    const existingCartItem = await sql.query`
      SELECT * FROM cart 
      WHERE userId = ${req.session.user.id} AND productId = ${productId} AND size = ${size}
    `;
    
    if (existingCartItem.recordset.length > 0) {
      // Update quantity if already in cart
      await sql.query`
        UPDATE cart 
        SET quantity = quantity + ${quantity} 
        WHERE userId = ${req.session.user.id} AND productId = ${productId} AND size = ${size}
      `;
    } else {
      // Add new item to cart
      await sql.query`
        INSERT INTO cart (userId, productId, quantity, size) 
        VALUES (${req.session.user.id}, ${productId}, ${quantity}, ${size})
      `;
    }
    
    res.json({ success: true, message: 'Ürün sepete eklendi' });
  } catch (err) {
    console.error('Sepete ekleme hatası:', err);
    res.status(500).json({ success: false, message: 'Bir hata oluştu' });
  }
});

// Favoriler sayfası endpoint'i
app.get('/favorilerim', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const wishlistItems = await sql.query`
      SELECT w.id, p.id as productId, p.name, p.description, p.price, p.discountedPrice, p.imageUrl, p.isNew, p.isOnSale
      FROM wishlist w
      JOIN products p ON w.productId = p.id
      WHERE w.userId = ${req.session.user.id}
    `;
    
    res.render('wishlist', { 
      user: req.session.user,
      wishlistItems: wishlistItems.recordset
    });
  } catch (err) {
    console.error('Favoriler getirme hatası:', err);
    res.render('wishlist', { 
      user: req.session.user,
      wishlistItems: [],
      error: 'Favoriler bilgileri alınırken bir hata oluştu'
    });
  }
});

// Favorilere ekleme endpoint'i
app.post('/favorilere-ekle', async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'Favorilere eklemek için giriş yapmalısınız' });
  }

  try {
    const { productId } = req.body;
    
    // Ürün kontrolü
    const product = await sql.query`SELECT * FROM products WHERE id = ${productId}`;
    if (product.recordset.length === 0) {
      return res.json({ success: false, message: 'Ürün bulunamadı' });
    }
    
    // Favorilerde bu ürün var mı kontrol et
    const existingItem = await sql.query`
      SELECT * FROM wishlist 
      WHERE userId = ${req.session.user.id} AND productId = ${productId}
    `;
    
    if (existingItem.recordset.length > 0) {
      // Varsa silme işlemi yap (toggle)
      await sql.query`
        DELETE FROM wishlist 
        WHERE userId = ${req.session.user.id} AND productId = ${productId}
      `;
      return res.json({ success: true, message: 'Ürün favorilerden çıkarıldı', action: 'removed' });
    } else {
      // Yoksa ekle
      await sql.query`
        INSERT INTO wishlist (userId, productId) 
        VALUES (${req.session.user.id}, ${productId})
      `;
      return res.json({ success: true, message: 'Ürün favorilere eklendi', action: 'added' });
    }
  } catch (err) {
    console.error('Favorilere ekleme hatası:', err);
    res.json({ success: false, message: 'Bir hata oluştu' });
  }
});

// Favorilerden çıkarma endpoint'i
app.post('/favorilerden-cikar', async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: false, message: 'İşlem için giriş yapmalısınız' });
  }

  try {
    const { wishlistItemId } = req.body;
    
    await sql.query`
      DELETE FROM wishlist 
      WHERE id = ${wishlistItemId} AND userId = ${req.session.user.id}
    `;
    
    res.json({ success: true, message: 'Ürün favorilerden çıkarıldı' });
  } catch (err) {
    console.error('Favorilerden çıkarma hatası:', err);
    res.json({ success: false, message: 'Bir hata oluştu' });
  }
});

// Siparişi tamamlama sayfası
app.get('/odeme', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    try {
        const cartItems = await sql.query`
            SELECT c.id, c.quantity, c.size, p.id as productId, p.name, p.price, p.discountedPrice, p.imageUrl 
            FROM cart c
            JOIN products p ON c.productId = p.id
            WHERE c.userId = ${req.session.user.id}
        `;

        if (cartItems.recordset.length === 0) {
            return res.redirect('/sepet');
        }

        res.render('checkout', {
            user: req.session.user,
            cartItems: cartItems.recordset
        });
    } catch (err) {
        console.error('Ödeme sayfası hatası:', err);
        res.redirect('/sepet');
    }
});

// Siparişi tamamlama endpoint'i
app.post('/siparisi-tamamla', async (req, res) => {
    if (!req.session.user) {
        return res.json({ success: false, message: 'Oturum süreniz dolmuş' });
    }

    try {
        // Sepetteki ürünleri al
        const cartItems = await sql.query`
            SELECT c.id, c.quantity, c.size, p.id as productId, p.name, p.price, p.discountedPrice
            FROM cart c
            JOIN products p ON c.productId = p.id
            WHERE c.userId = ${req.session.user.id}
        `;

        if (cartItems.recordset.length === 0) {
            return res.json({ success: false, message: 'Sepetiniz boş' });
        }

        // Toplam tutarı hesapla
        let total = 0;
        cartItems.recordset.forEach(item => {
            const price = item.discountedPrice || item.price;
            total += price * item.quantity;
        });

        // Sipariş numarası oluştur (basit bir örnek)
        const orderNumber = Date.now().toString().slice(-8);

        // Sipariş detaylarını kaydet
        const orderDetails = {
            orderNumber,
            userId: req.session.user.id,
            fullName: req.body.fullName,
            email: req.body.email,
            phone: req.body.phone,
            address: req.body.address,
            city: req.body.city,
            zipCode: req.body.zipCode,
            paymentMethod: req.body.paymentMethod,
            total: total,
            items: cartItems.recordset,
            status: 'pending',
            createdAt: new Date()
        };

        // Siparişi veritabanına kaydet
        await sql.query`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'orders')
            BEGIN
                CREATE TABLE orders (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    orderNumber NVARCHAR(50) NOT NULL,
                    userId INT NOT NULL,
                    fullName NVARCHAR(100) NOT NULL,
                    email NVARCHAR(100) NOT NULL,
                    phone NVARCHAR(20) NOT NULL,
                    address NVARCHAR(MAX) NOT NULL,
                    city NVARCHAR(100) NOT NULL,
                    zipCode NVARCHAR(20) NOT NULL,
                    paymentMethod NVARCHAR(50) NOT NULL,
                    total DECIMAL(10, 2) NOT NULL,
                    status NVARCHAR(50) NOT NULL,
                    createdAt DATETIME DEFAULT GETDATE(),
                    FOREIGN KEY (userId) REFERENCES users(id)
                )
            END
        `;

        await sql.query`
            INSERT INTO orders (orderNumber, userId, fullName, email, phone, address, city, zipCode, paymentMethod, total, status)
            VALUES (${orderNumber}, ${req.session.user.id}, ${req.body.fullName}, ${req.body.email}, ${req.body.phone}, 
                    ${req.body.address}, ${req.body.city}, ${req.body.zipCode}, ${req.body.paymentMethod}, ${total}, 'pending')
        `;

        // Sipariş detayları tablosunu oluştur ve kaydet
        await sql.query`
            IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'orderItems')
            BEGIN
                CREATE TABLE orderItems (
                    id INT PRIMARY KEY IDENTITY(1,1),
                    orderId INT NOT NULL,
                    productId INT NOT NULL,
                    quantity INT NOT NULL,
                    price DECIMAL(10, 2) NOT NULL,
                    size NVARCHAR(10) NOT NULL,
                    FOREIGN KEY (orderId) REFERENCES orders(id),
                    FOREIGN KEY (productId) REFERENCES products(id)
                )
            END
        `;

        const order = await sql.query`SELECT TOP 1 id FROM orders WHERE orderNumber = ${orderNumber}`;
        const orderId = order.recordset[0].id;

        // Sipariş ürünlerini kaydet
        for (const item of cartItems.recordset) {
            await sql.query`
                INSERT INTO orderItems (orderId, productId, quantity, price, size)
                VALUES (${orderId}, ${item.productId}, ${item.quantity}, ${item.discountedPrice || item.price}, ${item.size})
            `;
        }

        // Sepeti temizle
        await sql.query`
            DELETE FROM cart WHERE userId = ${req.session.user.id}
        `;

        // Sipariş detaylarını session'a kaydet
        req.session.lastOrder = {
            orderNumber,
            orderDetails
        };

        res.json({ 
            success: true, 
            message: 'Siparişiniz başarıyla alındı',
            redirectUrl: '/siparis-basarili'
        });
    } catch (err) {
        console.error('Sipariş tamamlama hatası:', err);
        res.json({ success: false, message: 'Sipariş işlemi sırasında bir hata oluştu' });
    }
});

// Sipariş başarılı sayfası
app.get('/siparis-basarili', (req, res) => {
    if (!req.session.user || !req.session.lastOrder) {
        return res.redirect('/');
    }

    const { orderNumber, orderDetails } = req.session.lastOrder;
    delete req.session.lastOrder; // Tek kullanımlık bilgiyi temizle

    res.render('order-success', {
        user: req.session.user,
        orderNumber,
        orderDetails
    });
});

// Sunucuyu başlat
connectToDB().then(async (connected) => {
  if (connected) {
    // Ürün resimlerini güncelle
    await updateProductImages();
  }
  
  app.listen(port, () => {
    console.log(`Sunucu http://localhost:${port} adresinde çalışıyor`);
    
    if (!connected) {
      console.log('UYARI: Veritabanı bağlantısı olmadan çalışıyor. Kayıt ve giriş özellikleri çalışmayacak.');
      console.log('Sayfaları görebilirsiniz ancak kullanıcı işlemleri yapılamaz.');
    }
  });
}); 
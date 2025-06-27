document.addEventListener('DOMContentLoaded', function() {
    // Form doğrulama
    const forms = document.querySelectorAll('.auth-form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const passwordField = form.querySelector('input[name="password"]');
            const password2Field = form.querySelector('input[name="password2"]');
            
            // Şifre eşleşme kontrolü (kayıt formunda)
            if (passwordField && password2Field) {
                if (passwordField.value !== password2Field.value) {
                    e.preventDefault();
                    alert('Şifreler eşleşmiyor. Lütfen kontrol edin.');
                    return;
                }
            }
            
            // Şifre uzunluk kontrolü
            if (passwordField && passwordField.value.length < 6) {
                e.preventDefault();
                alert('Şifre en az 6 karakter olmalıdır.');
                return;
            }
        });
    });
    
    // Kullanıcı mesajlarını otomatik kapatma
    const alerts = document.querySelectorAll('.alert');
    
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            setTimeout(() => {
                alert.style.display = 'none';
            }, 1000);
        }, 5000);
    });
    
    // Ürün kartlarında hover efekti
    const productCards = document.querySelectorAll('.product-card');
    
    productCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.querySelector('.product-actions').style.bottom = '0';
        });
        
        card.addEventListener('mouseleave', function() {
            this.querySelector('.product-actions').style.bottom = '-50px';
        });
    });
    
    // Bültene abone olma formu
    const newsletterForm = document.querySelector('.newsletter-form');
    
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            
            if (!email) {
                alert('Lütfen e-posta adresinizi girin.');
                return;
            }
            
            alert('Bültenimize başarıyla abone oldunuz!');
            this.reset();
        });
    }
    
    // Sepete ekleme işlemleri
    const addToCartButtons = document.querySelectorAll('.add-to-cart');
    
    addToCartButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productName = productCard.querySelector('h3').textContent;
            
            alert(`"${productName}" ürünü sepetinize eklendi.`);
        });
    });
    
    // Favorilere ekleme işlemleri
    const addToWishlistButtons = document.querySelectorAll('.add-to-wishlist');
    
    addToWishlistButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productName = productCard.querySelector('h3').textContent;
            
            alert(`"${productName}" ürünü favorilerinize eklendi.`);
        });
    });
    
    // Hızlı bakış işlemleri
    const quickViewButtons = document.querySelectorAll('.quick-view');
    
    quickViewButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Hızlı bakış işlemleri her sayfada ayrı ayrı ele alınıyor
            // Bu yüzden burada herhangi bir işlem yapmıyoruz
        });
    });
}); 
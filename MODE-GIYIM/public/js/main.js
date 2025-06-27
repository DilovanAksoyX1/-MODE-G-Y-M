// Ürün detay modalı için işlevler
document.addEventListener('DOMContentLoaded', function() {
    // Tüm "Hızlı Görünüm" butonlarını seç
    const quickViewButtons = document.querySelectorAll('.quick-view');
    const modal = document.getElementById('productModal');
    const closeBtn = document.querySelector('.close');
    
    // Her bir "Hızlı Görünüm" butonu için olay dinleyicisi ekle
    quickViewButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Butonun veri özelliklerinden ürün bilgilerini al
            const productId = this.getAttribute('data-id');
            const productName = this.getAttribute('data-name');
            const productPrice = this.getAttribute('data-price');
            const productImage = this.getAttribute('data-image');
            const productDescription = this.getAttribute('data-description');
            
            // Modal içeriğini güncelle
            document.getElementById('modalProductName').textContent = productName;
            document.getElementById('modalProductPrice').textContent = productPrice + ' TL';
            document.getElementById('modalProductImage').src = productImage;
            document.getElementById('modalProductDescription').textContent = productDescription || 'Ürün açıklaması bulunmamaktadır.';
            document.getElementById('modalAddToCart').setAttribute('data-id', productId);
            
            // Modalı göster
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Sayfanın kaydırılmasını engelle
        });
    });
    
    // Modal kapatma butonu
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto'; // Sayfanın kaydırılmasını tekrar etkinleştir
        });
    }
    
    // Modal dışına tıklandığında modalı kapat
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
    
    // Modal içindeki "Sepete Ekle" butonu
    const modalAddToCartBtn = document.getElementById('modalAddToCart');
    if (modalAddToCartBtn) {
        modalAddToCartBtn.addEventListener('click', function() {
            const productId = this.getAttribute('data-id');
            // Sepete ekleme işlemi burada yapılacak
            console.log('Ürün sepete eklendi:', productId);
            
            // Başarılı bir şekilde sepete eklendiğini göster
            alert('Ürün sepete eklendi!');
            
            // Modalı kapat
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    }
}); 
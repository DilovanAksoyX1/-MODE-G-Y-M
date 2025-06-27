// Favorilere ekleme fonksiyonu
function addToWishlist(productId) {
    fetch('/favorilere-ekle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            productId: productId
        })
    })
    .then(response => response.json())
    .then(data => {
        if(data.success) {
            const button = document.querySelector(`.add-to-wishlist[data-id="${productId}"]`);
            if (data.action === 'added') {
                button.classList.add('active');
                // Bildirim göster
                showNotification('Ürün favorilere eklendi! <a href="/favorilerim">Favorilerime Git</a>', 'success');
                // Kalp ikonunu dolu kalp yap
                const heartIcon = button.querySelector('i');
                heartIcon.classList.remove('far');
                heartIcon.classList.add('fas');
            } else {
                button.classList.remove('active');
                // Bildirim göster
                showNotification('Ürün favorilerden çıkarıldı!', 'info');
                // Kalp ikonunu boş kalp yap
                const heartIcon = button.querySelector('i');
                heartIcon.classList.remove('fas');
                heartIcon.classList.add('far');
            }
        } else {
            if(data.message === 'Favorilere eklemek için giriş yapmalısınız') {
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            } else {
                showNotification(data.message || 'Bir hata oluştu', 'error');
            }
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Bir hata oluştu', 'error');
    });
}

// Bildirim gösterme fonksiyonu
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = message;
    
    document.body.appendChild(notification);
    
    // CSS animasyonu için setTimeout
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 5 saniye sonra bildirimi kaldır
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Sayfa yüklendiğinde favori butonlarını ayarla
document.addEventListener('DOMContentLoaded', function() {
    // Favorilere ekle butonları için event listener
    const wishlistButtons = document.querySelectorAll('.add-to-wishlist');
    wishlistButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const productId = this.getAttribute('data-id');
            addToWishlist(productId);
        });
    });
}); 
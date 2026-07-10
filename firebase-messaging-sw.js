importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCVK3yF15Udps1l046kv6M1TASIwVEPcVs",
  authDomain: "duraspinvest.firebaseapp.com",
  projectId: "duraspinvest",
  storageBucket: "duraspinvest.firebasestorage.app",
  messagingSenderId: "280764832749",
  appId: "1:280764832749:web:a1fa6c44cf59518541a5e4"
});

const messaging = firebase.messaging();

// Mostrar notificación cuando la app está en segundo plano
messaging.onBackgroundMessage(function(payload) {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || 'Duraspinvest', {
    body: body || '',
    icon: '/duraspinvest/icon-192.png',
    badge: '/duraspinvest/icon-192.png',
    tag: 'duraspinvest-notif',
    requireInteraction: true
  });
});

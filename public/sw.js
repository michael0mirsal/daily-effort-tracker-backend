self.addEventListener('push', event => {
  const data = event.data.json(); // get payload from server
  const title = data.title || "Daily Effort Tracker";
  const options = {
    body: data.message || "You have a new notification",
    icon: '/icons/notification-icon.png',
    badge: '/icons/badge.png',
    data: { url: data.url || '/' } // open URL on click
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then(windowClients => {
      for (let client of windowClients) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

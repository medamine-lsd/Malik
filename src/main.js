/**
 * main.js — Point d'entrée de l'application Délégation V2.
 * Initialise les polices locales, enregistre le Service Worker PWA,
 * et affiche l'écran de démarrage.
 */
import '@fontsource/montserrat/400.css';
import '@fontsource/montserrat/600.css';
import '@fontsource/montserrat/700.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';

// Enregistrement PWA via Workbox (si supporté)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('PWA Service Worker actif avec le scope:', reg.scope);
    }).catch(err => {
      console.warn('Erreur enregistrement Service Worker:', err);
    });
  });
}

// Rendu Phase 1 : Validation du squelette et test hors-ligne
const app = document.getElementById('app');

app.innerHTML = `
  <div style="
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #F2F5FF;
    font-family: 'Inter', system-ui, sans-serif;
    color: #2D325A;
    padding: 24px;
    text-align: center;
    box-sizing: border-box;
  ">
    <div style="
      max-width: 420px;
      width: 100%;
      background: #FFFFFF;
      padding: 32px 24px;
      border-radius: 24px;
      box-shadow: 0 10px 30px rgba(62, 50, 196, 0.08);
      border: 1px solid rgba(45, 50, 90, 0.08);
    ">
      <div style="
        width: 64px;
        height: 64px;
        background: linear-gradient(135deg, #4732C4 0%, #7367F0 100%);
        border-radius: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;
        color: white;
        font-family: 'Montserrat', sans-serif;
        font-size: 32px;
        font-weight: 800;
        box-shadow: 0 8px 20px rgba(71, 50, 196, 0.3);
      ">A</div>
      
      <h1 style="
        font-family: 'Montserrat', sans-serif;
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #2D325A;
      ">Délégation V2</h1>
      
      <p style="
        font-size: 14px;
        color: #8A94A6;
        margin-bottom: 24px;
        line-height: 1.5;
      ">Ça démarre ✅ — Le squelette est prêt et l'application est prête à être installée.</p>

      <div style="
        background: #F8FAFC;
        border-radius: 14px;
        padding: 16px;
        margin-bottom: 24px;
        text-align: left;
        font-size: 13px;
        border: 1px solid rgba(45, 50, 90, 0.06);
      ">
        <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <span style="color: #10B981; font-weight: bold;">●</span>
          <span><b>Mode :</b> Portefeuille vierge (0 médecin)</span>
        </div>
        <div style="margin-bottom: 8px; display: flex; align-items: center; gap: 8px;">
          <span style="color: #10B981; font-weight: bold;">●</span>
          <span id="network-status"><b>Réseau :</b> En ligne</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #7367F0; font-weight: bold;">●</span>
          <span><b>PWA :</b> Prête pour installation</span>
        </div>
      </div>

      <button id="btn-test" style="
        width: 100%;
        background: linear-gradient(135deg, #4732C4 0%, #7367F0 100%);
        color: white;
        border: none;
        padding: 14px 20px;
        border-radius: 14px;
        font-family: 'Montserrat', sans-serif;
        font-weight: 600;
        font-size: 15px;
        cursor: pointer;
        box-shadow: 0 4px 15px rgba(71, 50, 196, 0.25);
        transition: transform 0.15s ease;
      ">Tester la réactivité</button>
      
      <p id="test-result" style="margin-top: 14px; font-size: 13px; color: #10B981; font-weight: 600; display: none;">
        Réponse instantanée ✓
      </p>
    </div>
  </div>
`;

// Écouteur réseau
const networkStatus = document.getElementById('network-status');
function updateOnlineStatus() {
  if (navigator.onLine) {
    networkStatus.innerHTML = `<b>Réseau :</b> <span style="color: #10B981;">En ligne</span>`;
  } else {
    networkStatus.innerHTML = `<b>Réseau :</b> <span style="color: #F59E0B;">Hors-ligne</span>`;
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

// Test interactif
const btnTest = document.getElementById('btn-test');
const testResult = document.getElementById('test-result');
btnTest.addEventListener('click', () => {
  testResult.style.display = 'block';
  setTimeout(() => {
    testResult.style.display = 'none';
  }, 2500);
});

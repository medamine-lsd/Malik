/**
 * share-or-download.js — Gestion du téléchargement et du partage direct (WhatsApp/Email).
 * Utilise la Web Share API lorsque disponible (très utile sur mobile et iPhone PWA).
 * Reçoit : fichier Blob, nom de fichier suggéré.
 * Renvoie : déclenche le menu de partage natif ou télécharge le fichier dans le navigateur.
 */

export async function shareOrDownloadFile(blob, filename) {
  const file = new File([blob], filename, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });

  // 1. Partage natif (WhatsApp, Mail, etc.)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Rapport Journalier AURA',
        text: `Voici le rapport journalier AURA : ${filename}`
      });
      return { shared: true };
    } catch (err) {
      if (err.name === 'AbortError') {
        return { cancelled: true };
      }
      console.warn('Partage natif non abouti, bascule vers téléchargement classique:', err);
    }
  }

  // 2. Téléchargement classique sécurisé dans le navigateur
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Révocation de l'URL objet après 10 secondes pour libérer la mémoire
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 10000);

  return { downloaded: true };
}

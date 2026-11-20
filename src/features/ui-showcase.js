/**
 * ui-showcase.js — Page de démonstration cachée (/#/ui).
 * Affiche tous les composants graphiques du design système pour validation visuelle.
 * Reçoit : l'élément conteneur dans lequel afficher les composants.
 */
import { createButton } from '../components/button.js';
import { createCard } from '../components/card.js';
import { createField } from '../components/field.js';
import { createToggleDN } from '../components/toggle-dn.js';
import { createChip } from '../components/chip.js';
import { showToast } from '../components/toast.js';
import { showConfirmModal } from '../components/confirm-modal.js';

export function renderUiShowcase(container) {
  container.innerHTML = '';

  const headerCard = createCard({
    title: '🎨 Démonstration du Design Système (/#/ui)',
    children: [
      '<p style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">Cette page permet de tester tous les composants graphiques et de vérifier le rendu selon la charte Ultramarine Soft UI.</p>'
    ]
  });

  // 1. Boutons
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px;';
  
  btnRow.appendChild(createButton({ text: 'Bouton Principal', variant: 'primary', icon: '✨' }));
  btnRow.appendChild(createButton({ text: 'Bouton Secondaire', variant: 'secondary' }));
  btnRow.appendChild(createButton({ text: 'Télécharger le rapport Excel', variant: 'success', icon: '📊' }));
  btnRow.appendChild(createButton({ text: 'Supprimer la visite', variant: 'danger', icon: '🗑️' }));

  const buttonsCard = createCard({
    title: '1. Boutons & Actions',
    children: [btnRow]
  });

  // 2. Interrupteurs D / ND & Produits AURA
  const toggleRow = document.createElement('div');
  toggleRow.style.cssText = 'display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;';
  toggleRow.innerHTML = '<span style="font-weight: 600; font-size: 14px;">Disponibilité produit :</span>';
  
  const toggle = createToggleDN({
    value: 'D',
    onChange: (val) => {
      showToast({ message: `Statut basculé en : ${val}`, type: val === 'D' ? 'success' : 'info' });
    }
  });
  toggleRow.appendChild(toggle.element);

  // Chips des produits
  const chipsTitle = document.createElement('div');
  chipsTitle.style.cssText = 'font-weight: 600; font-size: 14px; margin-bottom: 8px;';
  chipsTitle.textContent = 'Gamme AURA (produits discutés) :';

  const chipContainer = document.createElement('div');
  chipContainer.className = 'chip-container';

  const sampleProducts = [
    { nom: 'ACIDE FOLIQUE', couleur: '4F81BD' },
    { nom: 'AURA VIT C', couleur: 'C0504D' },
    { nom: 'AURA ZINC', couleur: '9BBB59' },
    { nom: 'AURA CALCI D', couleur: '8064A2' }
  ];

  for (const p of sampleProducts) {
    const chip = createChip({
      label: p.nom,
      color: p.couleur,
      onClick: (selected) => {
        showToast({ message: `${p.nom} : ${selected ? 'Sélectionné' : 'Désélectionné'}` });
      }
    });
    chipContainer.appendChild(chip.element);
  }

  const productsCard = createCard({
    title: '2. Disponibilité & Gamme AURA',
    children: [toggleRow, chipsTitle, chipContainer]
  });

  // 3. Formulaires
  const nameField = createField({
    label: 'Nom complet du médecin',
    placeholder: 'Ex: Dr. Benali Rachid',
    required: true
  });

  const telField = createField({
    label: 'Téléphone',
    type: 'tel',
    placeholder: '0550123456',
    inputmode: 'tel'
  });

  const obsField = createField({
    label: 'Observation de la visite',
    type: 'textarea',
    placeholder: 'Remarques, accueil du médecin, intentions de prescription...'
  });

  const formCard = createCard({
    title: '3. Champs de saisie',
    children: [nameField.element, telField.element, obsField.element]
  });

  // 4. Toasts & Modals
  const actionRow = document.createElement('div');
  actionRow.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

  actionRow.appendChild(createButton({
    text: 'Tester Toast Standard',
    variant: 'secondary',
    onClick: () => showToast({ message: 'Visite enregistrée avec succès ✓', type: 'success' })
  }));

  actionRow.appendChild(createButton({
    text: 'Tester Toast avec « Annuler » (6s)',
    variant: 'secondary',
    onClick: () => showToast({
      message: 'Visite supprimée',
      actionLabel: 'Annuler',
      onAction: () => showToast({ message: 'Suppression annulée !', type: 'success' })
    })
  }));

  actionRow.appendChild(createButton({
    text: 'Ouvrir Modal de confirmation',
    variant: 'danger',
    onClick: () => showConfirmModal({
      title: 'Supprimer ce rapport ?',
      message: 'Toutes les visites enregistrées pour aujourd’hui seront archivées.',
      confirmText: 'Oui, supprimer',
      isDanger: true,
      onConfirm: () => showToast({ message: 'Rapport supprimé', type: 'error' })
    })
  }));

  // Thème Sombre / Clair toggle
  actionRow.appendChild(createButton({
    text: 'Basculer Thème Clair / Sombre',
    variant: 'primary',
    icon: '🌓',
    onClick: () => {
      const root = document.documentElement;
      const isDark = root.getAttribute('data-theme') === 'dark';
      root.setAttribute('data-theme', isDark ? 'light' : 'dark');
      showToast({ message: `Thème : ${isDark ? 'Clair' : 'Sombre'}` });
    }
  }));

  const feedbackCard = createCard({
    title: '4. Toasts, Dialogue & Thème',
    children: [actionRow]
  });

  container.appendChild(headerCard);
  container.appendChild(buttonsCard);
  container.appendChild(productsCard);
  container.appendChild(formCard);
  container.appendChild(feedbackCard);
}

// Categories built from real SBO database product lines
// productLineIDs are used for API filtering: GET /api/products?productLineID=...
export const categories = [
  {
    id: 'all',
    label: 'Tout',
    labelFr: 'Tout',
    icon: '🛍️',
    count: 5378,
    productLineIDs: [],
  },
  {
    id: 'femmes',
    label: 'Vêtements Femmes',
    labelFr: 'Vêtements Femmes',
    icon: '👗',
    count: 1026,
    productLineIDs: ['PL_0000045'],
  },
  {
    id: 'art',
    label: 'Art Africain',
    labelFr: 'Oeuvres d\'art',
    icon: '🎭',
    count: 523,
    productLineIDs: ['PL_0000020'],
  },
  {
    id: 'hommes',
    label: 'Vêtements Hommes',
    labelFr: 'Vêtements Hommes',
    icon: '👔',
    count: 522,
    productLineIDs: ['PL_0000046'],
  },
  {
    id: 'bijoux',
    label: 'Bijoux',
    labelFr: 'Bijoux',
    icon: '💎',
    count: 1022,
    productLineIDs: [
      'PL_0000005', // Bijoux nez, reins, chevilles, et cheveux
      'PL_0000006', // Boucles d'oreilles
      'PL_0000010', // Colliers
      'PL_0000008', // Bracelets
      'PL_0000007', // Boutons de manchette
      'PL_0000004', // Bagues
      'PL_0000012', // Parures
      'PL_0000009', // Broches, badges, perles & pins
      'PL_0000011', // Montres
    ],
  },
  {
    id: 'maison',
    label: 'Maison & Décor',
    labelFr: 'Maison & Décor',
    icon: '🏠',
    count: 560,
    productLineIDs: [
      'PL_0000030', // Meubles
      'PL_0000024', // Chambre
      'PL_0000028', // Salles de séjour et à manger
      'PL_0000018', // Coussins, Rideaux & Tapis
      'PL_0000026', // Eclairage
      'PL_0000023', // Boites de rangements
      'PL_0000025', // Cuisine
      'PL_0000027', // Salle de bains
      'PL_0000017', // Accessoires décoration
      'PL_0000049', // Décoration des équipements ou des objets
      'PL_0000029', // Autres fournitures
    ],
  },
  {
    id: 'sacs',
    label: 'Sacs & Maroquinerie',
    labelFr: 'Sacs & Maroquinerie',
    icon: '👜',
    count: 422,
    productLineIDs: [
      'PL_0000033', // Fourre-tout
      'PL_0000036', // Sac de loisir
      'PL_0000041', // Trousse
      'PL_0000040', // Sac à dos
      'PL_0000039', // Sac à main
      'PL_0000037', // Sac de sport et voyage
      'PL_0000035', // Portefeuille
      'PL_0000034', // Pochette
      'PL_0000038', // Sac à langer
    ],
  },
  {
    id: 'tissus',
    label: 'Tissus & Pagnes',
    labelFr: 'Tissus & Pagnes',
    icon: '🧵',
    count: 305,
    productLineIDs: [
      'PL_0000043', // Tissus de décoration
      'PL_0000042', // Tissus d'habillement
    ],
  },
  {
    id: 'enfants',
    label: 'Enfants & Bébés',
    labelFr: 'Enfants & Bébés',
    icon: '👶',
    count: 463,
    productLineIDs: [
      'PL_0000044', // Vêtements pour bébés et enfants
      'PL_0000050', // Vêtements mixtes
      'PL_0000013', // Chaussures pour enfant
    ],
  },
  {
    id: 'chaussures',
    label: 'Chaussures',
    labelFr: 'Chaussures',
    icon: '👟',
    count: 237,
    productLineIDs: [
      'PL_0000015', // Chaussures pour homme
      'PL_0000014', // Chaussures pour femme
      'PL_0000016', // Chaussures pour tous
    ],
  },
  {
    id: 'beaute',
    label: 'Beauté & Santé',
    labelFr: 'Beauté & Santé',
    icon: '💄',
    count: 150,
    productLineIDs: [
      'PL_0000048', // Accessoires beauté: cheveux
      'PL_0000002', // Cosmetiques
      'PL_0000003', // Santé
      'PL_0000047', // Soins corporels et hygiéniques
    ],
  },
  {
    id: 'accessoires',
    label: 'Chapeaux & Écharpes',
    labelFr: 'Chapeaux & Écharpes',
    icon: '🧣',
    count: 118,
    productLineIDs: ['PL_0000051'],
  },
]

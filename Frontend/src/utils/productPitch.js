function normalize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function hashString(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0
  }
  return h
}

function pick(arr, seed) {
  return arr[seed % arr.length]
}

// Ordered so more specific buckets are tested before the catch-alls they'd
// otherwise collide with (e.g. "sac en tissu pagne" must hit `sacs` before `tissus`).
const CATEGORY_KEYWORDS = [
  ['enfant', ['enfant', 'bebe', 'couche', 'jouet', 'fille', 'garcon']],
  ['chaussures', ['chaussure', 'basket', 'sandale', 'babouche', 'mocassin', 'ballerine', 'escarpin', 'botte', 'tong', 'espadrille']],
  ['bijoux', ['bijou', 'bague', 'bracelet', 'collier', 'boucle', 'pendentif', 'pendante', 'broche', 'chaine', 'parure', 'perle', 'cauris', 'piercing', 'sautoir', 'anneau', 'medaillon', 'pins', 'montre', 'levre', 'manchette']],
  ['sacs', ['sac ', 'sacà', 'sacs', 'portefeuille', 'pochette', 'poche', 'trousse', 'fourre-tout', 'fourretout', 'cartable']],
  ['accessoires', ['ceinture', 'turban', 'foulard', 'echarpe', 'eventail', 'badge', 'bandeau', 'chapeau', 'cravate', 'noeud']],
  ['tissus', ['tissu', 'pagne', 'wax', 'bazin', 'indigo', 'adire', 'coton', 'cotton']],
  ['deco', ['masque', 'statuette', 'peinture', 'tableau', 'vase', 'miroir', 'decoratif', 'deco', 'guirlande', 'ruban', 'bougie', 'lampe', 'fleur', 'dessous', 'torche', 'objet']],
  ['maison', ['literie', 'rideau', 'tapis', 'nappe', 'serviette', 'tablier', 'vaisselle', 'ustensile', 'plateau', 'filtre']],
  ['meubles', ['meuble', 'table', 'chaise', 'fauteuil', 'lit', 'commode', 'tabouret', 'banc', 'pouf', 'coiffeuse', 'vaisselier', 'salon', 'canape', 'rangement', 'boite', 'coffret']],
  ['spiritualite', ['bible', 'coran', 'cantique']],
  ['gourmet', ['cafe', 'the sante', 'gourmand']],
  ['bienetre', ['savon', 'parfum', 'huile', 'creme', 'lotion', 'gel', 'meche', 'perruque', 'dreadlock', 'vernis', 'soin', 'sante', 'moustique', 'eponge', 'toilette', 'fertilite', 'energetique', 'dentaire', 'cheveu', 'champoing', 'shampoing']],
  ['mode', ['vetement', 'chemise', 'robe', 'jupe', 'pantalon', 'short', 'veste', 'manteau', 'gilet', 'pull', 'combinaison', 'tenue', 'tunique', 'top', 'maillot', 'sous-vetement', 'bermuda', 'ensemble', 'tailleur']],
]

function categoryFor(product) {
  const label = normalize(product.productTypeName || product.name || '')
  for (const [cat, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => label.includes(k))) return cat
  }
  return 'default'
}

function materialClause(product, seed) {
  const hasMaterial = Boolean(product.rawMaterial)
  const bits = []
  if (product.rawMaterial) bits.push(`en ${product.rawMaterial}`)
  if (product.color) bits.push(`coloris ${product.color}`)
  const materialPart = bits.length ? bits.join(', ') : null
  const originPart = product.madeIn || null

  if (materialPart && originPart) {
    return pick([
      `Confectionné ${materialPart}, fabriqué en ${originPart}.`,
      hasMaterial
        ? `On aime sa matière — ${materialPart} — pensée et fabriquée en ${originPart}.`
        : `On aime son style — ${materialPart} — pensé et fabriqué en ${originPart}.`,
      `Réalisé ${materialPart}, avec un savoir-faire venu tout droit de ${originPart}.`,
    ], seed)
  }
  if (materialPart) {
    return pick([
      `Confectionné ${materialPart}, pour un rendu qui ne trompe pas.`,
      hasMaterial
        ? `Sa matière — ${materialPart} — fait toute la différence.`
        : `Son style — ${materialPart} — fait toute la différence.`,
    ], seed)
  }
  if (originPart) {
    return pick([
      `Fabriqué en ${originPart}, avec tout le savoir-faire que cela suppose.`,
      `Une pièce venue tout droit de ${originPart}.`,
    ], seed)
  }
  return null
}

const CATEGORY_COPY = {
  bijoux: {
    hooks: [
      "Un bijou qui ne passe pas inaperçu : {name} sublime chaque tenue en une seconde.",
      "{name} est de ces pièces qui transforment un simple look en déclaration de style.",
      "Osez l'éclat : {name} capte la lumière et tous les regards.",
      "Petit par la taille, grand par l'effet — {name} est le détail qui change tout.",
    ],
    closers: [
      "Le genre d'accessoire qu'on ne quitte plus.",
      "Une pièce à s'offrir, ou à offrir.",
      "Simple à porter, impossible à ignorer.",
    ],
  },
  mode: {
    hooks: [
      "{name} : la pièce qui donne le ton à toute la garde-robe.",
      "Coupe soignée, allure affirmée — {name} s'impose dans le dressing.",
      "Avec {name}, chaque sortie devient une occasion de briller.",
      "{name} habille avec caractère, sans jamais forcer le trait.",
    ],
    closers: [
      "Un basique qui n'a rien d'ordinaire.",
      "À porter dès aujourd'hui, à adopter pour longtemps.",
      "Le vêtement qui fait qu'on vous remarque.",
    ],
  },
  chaussures: {
    hooks: [
      "{name} : à chaque pas, un style affirmé.",
      "Confort et allure se rencontrent enfin dans {name}.",
      "{name} accompagne vos journées sans jamais faire de compromis sur le style.",
      "Posez le pied avec assurance : {name} ne déçoit jamais.",
    ],
    closers: [
      "La paire qu'on attrape les yeux fermés en sortant.",
      "Fait pour marcher, pensé pour plaire.",
      "Le détail aux pieds qui change toute la silhouette.",
    ],
  },
  sacs: {
    hooks: [
      "{name} : l'allié discret qui suit partout, sans jamais passer inaperçu.",
      "Pensé pour l'essentiel, {name} a du style à revendre.",
      "{name} transporte vos affaires... et votre style avec.",
      "Un sac qui a du caractère : voici {name}.",
    ],
    closers: [
      "Léger à porter, lourd de sens.",
      "L'accessoire qu'on ne laisse plus à la maison.",
      "Pratique au quotidien, remarqué en toute occasion.",
    ],
  },
  tissus: {
    hooks: [
      "{name} : un tissu qui raconte une histoire à chaque motif.",
      "Entre tradition et créativité, {name} habille les plus belles idées.",
      "{name} porte en lui tout un savoir-faire textile.",
      "Une texture et des couleurs qui ne laissent personne indifférent : {name}.",
    ],
    closers: [
      "De quoi imaginer mille créations.",
      "Une matière première pour donner vie à vos idées.",
      "Authentique, coloré, prêt à être transformé.",
    ],
  },
  deco: {
    hooks: [
      "{name} : une pièce qui capte le regard et raconte une histoire.",
      "Objet d'art ou pièce de caractère, {name} transforme n'importe quel espace.",
      "{name} apporte une touche d'authenticité à votre intérieur.",
      "Chaque détail de {name} a été pensé pour marquer les esprits.",
    ],
    closers: [
      "La pièce qui donne le ton à toute une pièce.",
      "Un objet qui suscite toujours la même question : « où l'avez-vous trouvé ? »",
      "Bien plus qu'une décoration, une signature.",
    ],
  },
  maison: {
    hooks: [
      "{name} : le petit détail qui rend un intérieur chaleureux.",
      "{name} enveloppe la maison d'une touche de douceur et de style.",
      "Confort et esthétique se rejoignent dans {name}.",
      "Un intérieur cosy commence toujours par un détail comme {name}.",
    ],
    closers: [
      "Simple à ajouter, impossible à ignorer une fois en place.",
      "Le confort qui se voit autant qu'il se ressent.",
      "Une touche qui change toute l'ambiance.",
    ],
  },
  meubles: {
    hooks: [
      "{name} : le genre de meuble qui redéfinit une pièce entière.",
      "Robuste et élégant, {name} s'installe pour durer.",
      "{name} allie fonction et allure — l'équilibre parfait pour la maison.",
      "Avec {name}, chaque coin de la maison gagne en caractère.",
    ],
    closers: [
      "Fait pour être vu, pensé pour durer.",
      "Le meuble qui change une pièce en un lieu de vie.",
      "Solide, élégant, indispensable.",
    ],
  },
  spiritualite: {
    hooks: [
      "{name} : un compagnon de foi et de réflexion, à garder toujours près de soi.",
      "{name} accompagne les moments de recueillement avec sobriété et sens.",
      "Un objet porteur de sens : {name}.",
    ],
    closers: [
      "Une présence qui apaise, un texte qui guide.",
      "À offrir, à conserver, à transmettre.",
    ],
  },
  gourmet: {
    hooks: [
      "{name} : une pause gourmande à savourer sans culpabilité.",
      "{name} réveille les sens dès la première gorgée.",
      "Un vrai moment de plaisir se cache dans {name}.",
    ],
    closers: [
      "À déguster, à partager, à adopter.",
      "Le petit plaisir qu'on garde toujours à portée de main.",
    ],
  },
  enfant: {
    hooks: [
      "{name} : pensé pour les petits, approuvé par les grands.",
      "{name} accompagne les tout-petits avec douceur et sécurité.",
      "Un indispensable du quotidien des enfants : {name}.",
    ],
    closers: [
      "Doux pour eux, pratique pour vous.",
      "Le genre d'article qu'on adopte pour toute la famille.",
    ],
  },
  accessoires: {
    hooks: [
      "{name} : le détail qui complète une tenue sans jamais l'alourdir.",
      "{name} s'ajoute à tout, et rehausse tout.",
      "Un accessoire qui parle sans dire un mot : {name}.",
    ],
    closers: [
      "Le détail qu'on remarque en dernier — et qu'on n'oublie jamais.",
      "Petit ajout, grand impact.",
    ],
  },
  bienetre: {
    hooks: [
      "{name} : un moment de soin à s'offrir chaque jour.",
      "Prendre soin de soi commence avec {name}.",
      "{name} transforme la routine en petit rituel de bien-être.",
      "Simple, efficace, {name} fait la différence dès la première utilisation.",
    ],
    closers: [
      "Le genre de produit qu'on ne veut plus quitter.",
      "Un petit geste, un grand bien-être.",
      "Adopté une fois, indispensable ensuite.",
    ],
  },
  default: {
    hooks: [
      "{name} : une pièce qui mérite qu'on s'y attarde.",
      "Voici {name}, un article pensé pour se démarquer.",
      "{name} a ce petit quelque chose qui attire l'œil.",
    ],
    closers: [
      "Une trouvaille à ne pas laisser filer.",
      "Le genre d'article qu'on est content d'avoir découvert.",
    ],
  },
}

/** Generates a short, category-aware marketing blurb for a product (French ad copy). */
export function generateProductPitch(product) {
  if (!product) return ''
  const seed = hashString(product.productID || product.name || 'x')
  const copy = CATEGORY_COPY[categoryFor(product)] || CATEGORY_COPY.default
  const hook = pick(copy.hooks, seed).replace(/\{name\}/g, product.name || 'Cet article')
  const material = materialClause(product, (seed >>> 3) + 1)
  const closer = pick(copy.closers, (seed >>> 5) + 1)
  return [hook, material, closer].filter(Boolean).join(' ')
}

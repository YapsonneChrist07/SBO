import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSupplierSummary } from '../../api/supplierPortal'
import { formatPriceOrTBD } from '../../utils/format'
import './PartnerHomePage.css'

const plural = (n, word) => `${n} ${word}${n > 1 ? 's' : ''}`

// Home space for supplier and transporter accounts. Sections with a `to` link to a
// built page and show a live figure from the summary; the rest are placeholders.
const ROLE_CONTENT = {
  supplier: {
    eyebrow: 'Espace fournisseur',
    intro: 'Gérez votre catalogue, vos prix par boutique et suivez les commandes que SBO vous adresse.',
    loadSummary: getSupplierSummary,
    sections: [
      {
        title: 'Mes produits & prix',
        text: 'Référencez les produits que vous fournissez à SBO, avec votre code produit et votre prix unitaire.',
        to: '/supplier/products',
        stat: (s) => plural(s.productCount, 'produit'),
      },
      {
        title: 'Prix par boutique',
        text: 'Indiquez un prix différent selon la boutique SBO livrée, depuis la fiche de chaque produit.',
        to: '/supplier/products',
        stat: (s) => `${s.pricedInShops} / ${s.productCount} produit${s.productCount > 1 ? 's' : ''} avec prix par boutique`,
      },
      {
        title: 'Commandes d’achat',
        text: 'Suivez les bons de commande que SBO vous adresse, leur montant et leur transport.',
        to: '/supplier/orders',
        stat: (s) => s.purchaseCount
          ? `${plural(s.purchaseCount, 'commande')} · ${formatPriceOrTBD(s.purchaseTotal)}`
          : 'Aucune commande',
      },
      {
        title: 'Avis & évaluation',
        text: 'Consultez la note et les avis attribués à votre entreprise.',
        to: '/supplier/reviews',
        stat: (s) => s.reviewCount
          ? `${s.averageRating.toFixed(1)} ★ · ${s.reviewCount} avis`
          : 'Pas encore d’avis',
      },
    ],
  },
  transporter: {
    eyebrow: 'Espace transporteur',
    intro: 'Suivez les expéditions et livraisons qui vous sont confiées et publiez vos tarifs par trajet.',
    sections: [
      { title: 'Expéditions clients', text: 'Les commandes SBO à livrer aux clients : statut, délai prévu et confirmation de réception.' },
      { title: 'Livraisons fournisseurs', text: 'Les marchandises à récupérer chez les fournisseurs et à acheminer vers SBO.' },
      { title: 'Trajets & tarifs', text: 'Définissez les trajets que vous desservez et votre coût par tranche de poids.' },
      { title: 'Historique', text: 'Retrouvez vos transports passés et les montants facturés.' },
    ],
  },
}

export default function PartnerHomePage() {
  const { user, token } = useAuth()
  const content = ROLE_CONTENT[user.role]
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (!content.loadSummary) return
    content.loadSummary(token).then(setSummary).catch(() => setSummary(null))
  }, [content, token])

  return (
    <main className="partner-home">
      <header className="partner-home__header">
        <p className="partner-home__eyebrow">{content.eyebrow}</p>
        <h1>{user.organizationName}</h1>
        <p className="partner-home__welcome">
          Bonjour {user.firstName}. {content.intro}
        </p>
      </header>

      <section className="partner-home__grid">
        {content.sections.map((section) => {
          const body = (
            <>
              {section.to ? (
                <span className="partner-home__stat">{summary ? section.stat(summary) : '…'}</span>
              ) : (
                <span className="partner-home__badge">Bientôt disponible</span>
              )}
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </>
          )
          return section.to ? (
            <Link key={section.title} to={section.to} className="partner-home__card partner-home__card--link">
              {body}
              <span className="partner-home__cta">Ouvrir →</span>
            </Link>
          ) : (
            <article key={section.title} className="partner-home__card">{body}</article>
          )
        })}
      </section>
    </main>
  )
}

import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getSupplierSummary } from '../../api/supplierPortal'
import { getTransporterSummary } from '../../api/transporterPortal'
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
    intro: 'Suivez les livraisons et enlèvements qui vous sont confiés et publiez vos tarifs par destination.',
    loadSummary: getTransporterSummary,
    sections: [
      {
        title: 'Livraisons clients',
        text: 'Les commandes SBO à livrer aux clients : adresse, contenu du colis, prise en charge et confirmation de livraison.',
        to: '/transporter/deliveries',
        stat: (s) => {
          const open = s.shipments.assigned + s.shipments.in_transit
          return open ? `${plural(open, 'livraison')} en cours` : `${plural(s.shipments.delivered, 'livraison')} effectuée${s.shipments.delivered > 1 ? 's' : ''}`
        },
      },
      {
        title: 'Enlèvements fournisseurs',
        text: 'Les marchandises à récupérer chez les fournisseurs et à acheminer vers les boutiques SBO.',
        to: '/transporter/pickups',
        stat: (s) => s.pickupsPending ? `${plural(s.pickupsPending, 'enlèvement')} à faire` : 'Aucun enlèvement en attente',
      },
      {
        title: 'Mes tarifs',
        text: 'Votre coût de transport par destination et par tranche de poids, pour une zone entière ou un pays précis.',
        to: '/transporter/tariffs',
        stat: (s) => s.rateCount ? `${s.rateCount} tarifs · ${plural(s.zoneCount, 'zone')}` : 'Aucun tarif publié',
      },
    ],
  },
}

export default function PartnerHomePage() {
  const { user, token } = useAuth()
  const content = ROLE_CONTENT[user.role]
  const active = user.organizationStatus === 'active'
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (!active || !content.loadSummary) return
    content.loadSummary(token).then(setSummary).catch(() => setSummary(null))
  }, [active, content, token])

  return (
    <main className="partner-home">
      <header className="partner-home__header">
        <p className="partner-home__eyebrow">{content.eyebrow}</p>
        <h1>{user.organizationName}</h1>
        <p className="partner-home__welcome">
          Bonjour {user.firstName}. {content.intro}
        </p>
      </header>

      {!active && (
        <div className="partner-home__pending" role="status">
          <h2>Votre compte est en cours de validation</h2>
          <p>
            Merci pour votre inscription&nbsp;! L’équipe SBO vérifie les informations de votre entreprise.
            Votre espace s’ouvrira dès que votre compte sera validé — reconnectez-vous à ce moment-là.
          </p>
        </div>
      )}

      <section className="partner-home__grid">
        {content.sections.map((section) => {
          const body = (
            <>
              {active && section.to ? (
                <span className="partner-home__stat">{summary ? section.stat(summary) : '…'}</span>
              ) : (
                <span className="partner-home__badge">{active ? 'Bientôt disponible' : 'Après validation'}</span>
              )}
              <h2>{section.title}</h2>
              <p>{section.text}</p>
            </>
          )
          return active && section.to ? (
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

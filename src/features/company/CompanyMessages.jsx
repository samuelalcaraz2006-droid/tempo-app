import React from 'react'
import ConversationsList from '../shared/ConversationsList'

export default function CompanyMessages({ userId, onOpenChat }) {
  return (
    <ConversationsList
      userId={userId}
      onOpenChat={onOpenChat}
      title="Messages"
      subtitle="Vos conversations avec les travailleurs"
      emptyTitle="Aucune conversation"
      emptyDescription="La messagerie s'ouvre apres avoir accepte un travailleur. Depuis une candidature acceptee, ouvrez la fiche et touchez « Contacter »."
    />
  )
}


import ConversationsList from '../shared/ConversationsList'

export default function CompanyMessages({ userId, onOpenChat }) {
  return (
    <ConversationsList
      userId={userId}
      onOpenChat={onOpenChat}
      title="Messages"
      subtitle="Vos conversations avec les travailleurs"
      emptyTitle="Aucune conversation"
      emptyDescription="La messagerie s'ouvre après avoir accepte un travailleur. Depuis une candidature acceptée, ouvrez la fiche et touchez « Contacter »."
    />
  )
}

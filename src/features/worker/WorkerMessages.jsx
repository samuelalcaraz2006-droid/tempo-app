
import ConversationsList from '../shared/ConversationsList'

export default function WorkerMessages({ userId, onOpenChat }) {
  return (
    <ConversationsList
      userId={userId}
      onOpenChat={onOpenChat}
      title="Messages"
      subtitle="Vos conversations avec les entreprises"
      emptyTitle="Aucune conversation"
      emptyDescription="La messagerie s'ouvre apres acceptation d'une candidature. Depuis une candidature acceptee, touchez « Contacter » pour demarrer."
    />
  )
}

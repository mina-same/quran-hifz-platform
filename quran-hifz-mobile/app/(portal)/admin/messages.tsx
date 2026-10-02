import MessagesScreen from '@/components/domain/MessagesScreen';

// Admin + supervisor inbox (e.g. student notes sent via POST /messages/to-supervisors).
export default function AdminMessages() {
  return <MessagesScreen />;
}

import { redirect } from 'next/navigation';

export default function DashboardFavoritesRedirectPage() {
  redirect('/favorites');
}

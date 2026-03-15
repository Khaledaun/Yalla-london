import { Users } from 'lucide-react'
import { isPremiumFeatureEnabled } from '@/lib/feature-flags'
import {
  AdminPageHeader,
  AdminEmptyState,
} from '@/components/admin/admin-ui'

export default function MembersPage() {
  const peopleManagementEnabled = isPremiumFeatureEnabled('PEOPLE_MANAGEMENT')

  if (!peopleManagementEnabled) {
    return (
      <div className="admin-page p-4 md:p-6">
        <AdminPageHeader
          title="Members & Roles"
          subtitle="Manage team members and their roles"
        />
        <AdminEmptyState
          icon={Users}
          title="People Management Not Available"
          description="People management features are not currently enabled."
        />
      </div>
    )
  }

  return (
    <div className="admin-page p-4 md:p-6">
      <AdminPageHeader
        title="Members & Roles"
        subtitle="Manage team members and their roles"
      />
      <AdminEmptyState
        icon={Users}
        title="No team members"
        description="Team member management coming soon."
      />
    </div>
  )
}
import { UserProfile } from '@clerk/nextjs';

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            Manage Your Profile
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Update your account settings and personal information
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <UserProfile 
            appearance={{
              elements: {
                card: 'shadow-none border-none',
                navbar: 'hidden',
                pageScrollBox: 'padding-0',
              },
            }}
            routing="hash"
          />
        </div>
      </div>
    </div>
  );
}

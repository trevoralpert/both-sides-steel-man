import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Join Both Sides
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Create your account and start meaningful debates
          </p>
        </div>
        <SignUp 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
              card: 'shadow-lg',
            },
          }}
          redirectUrl="/onboarding"
          signInUrl="/sign-in"
        />
      </div>
    </div>
  );
}

import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <SignUp
      appearance={{
        elements: {
          rootBox: 'w-full max-w-sm',
          card: 'bg-[#111111] border border-[#2A2A2A] shadow-none rounded-none',
          headerTitle: 'font-display text-white tracking-wider text-2xl',
          headerSubtitle: 'text-[#888888]',
          socialButtonsBlockButton:
            'bg-[#1A1A1A] border border-[#2A2A2A] text-white hover:border-[#FF4500] hover:bg-[#1A1A1A] rounded-none transition-colors',
          socialButtonsBlockButtonText: 'text-white font-medium',
          dividerLine: 'bg-[#2A2A2A]',
          dividerText: 'text-[#888888] text-xs',
          formFieldLabel: 'text-[#888888] text-xs uppercase tracking-wider',
          formFieldInput:
            'bg-[#0A0A0A] border-[#2A2A2A] text-white rounded-none focus:border-[#FF4500] focus:ring-0',
          formButtonPrimary:
            'bg-[#FF4500] hover:bg-[#FF4500] hover:shadow-[0_0_20px_rgba(255,69,0,0.4)] text-white rounded-none font-semibold uppercase tracking-wider transition-all',
          footerActionLink: 'text-[#FF4500] hover:text-[#FF6633]',
          identityPreviewText: 'text-white',
          identityPreviewEditButton: 'text-[#FF4500]',
          formFieldInputShowPasswordButton: 'text-[#888888]',
        },
        variables: {
          colorPrimary: '#FF4500',
          colorBackground: '#111111',
          colorText: '#FFFFFF',
          colorTextSecondary: '#888888',
          colorInputBackground: '#0A0A0A',
          colorInputText: '#FFFFFF',
          borderRadius: '0px',
        },
      }}
    />
  );
}

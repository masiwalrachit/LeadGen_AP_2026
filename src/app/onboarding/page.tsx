export default function OnboardingPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#0a0b0d] px-6 text-[#f4f2ec]">
      <section className="max-w-xl text-center">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#e763a9]">
          Authentication complete
        </p>
        <h1 className="text-4xl font-semibold tracking-[-0.035em] sm:text-5xl">
          Your agency setup starts here.
        </h1>
        <p className="mx-auto mt-5 max-w-lg leading-7 text-[#aaa69b]">
          This route is ready for the next step: services, target markets, and
          the first lead campaign.
        </p>
      </section>
    </main>
  );
}

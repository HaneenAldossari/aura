export default function SampleGallery({
  samples,
  onSampleClick,
}: {
  samples: string[];
  onSampleClick: (id: string) => void;
}) {
  return (
    <div>
      <p className="text-cream-muted text-xs uppercase tracking-widest mb-1">
        Or try a sample face
      </p>
      <p className="text-cream-muted/70 text-xs mb-4">
        AI-generated — explore without sharing your photo
      </p>
      <div className="grid grid-cols-3 gap-2">
        {samples.map((id) => (
          <button
            key={id}
            onClick={() => onSampleClick(id)}
            className="relative aspect-square rounded-lg overflow-hidden border border-gold/15 hover:border-gold/50 transition cursor-pointer group"
          >
            <img
              src={`/demo-faces/${id}.png`}
              alt={id}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gold/0 group-hover:bg-gold/10 transition" />
          </button>
        ))}
      </div>
    </div>
  );
}

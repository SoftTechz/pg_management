export default function ModuleHeader({ icon, title, tagline, action }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 md:mb-5">
      <div className="flex items-start gap-2.5">
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-700">
          {icon}
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">
            {title}
          </h1>
          <p className="text-xs md:text-sm text-gray-500 mt-0.5">{tagline}</p>
        </div>
      </div>
      {action ? <div className="w-full sm:w-auto">{action}</div> : null}
    </div>
  );
}

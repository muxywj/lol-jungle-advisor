"use client";

interface Props {
  title?: string;
  message: string;
}

export default function ErrorMessage({ title = "오류", message }: Props) {
  return (
    <div className="rounded-lg border border-red-800 bg-red-950/40 px-5 py-4">
      <p className="text-sm font-semibold text-red-400">{title}</p>
      <p className="mt-1 text-sm text-red-300">{message}</p>
    </div>
  );
}

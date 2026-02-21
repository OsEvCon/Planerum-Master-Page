"use client";

import { useState } from "react";

type MasterBioProps = {
  bio: string;
};

export function MasterBio({ bio }: MasterBioProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 py-2 text-left text-[var(--primary)] transition-opacity hover:opacity-90 hover:underline focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2 rounded"
        aria-expanded={isOpen}
        aria-controls="master-bio-content"
      >
        <span className="font-medium">О мастере</span>
        <svg
          className={`h-5 w-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        id="master-bio-content"
        className="grid transition-[grid-template-rows] duration-200 ease-in-out"
        style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
        aria-hidden={!isOpen}
      >
        <div className="overflow-hidden">
          <div className="pt-2 pb-4 pr-4 text-[var(--secondary)] leading-relaxed">
            {bio}
          </div>
        </div>
      </div>
    </div>
  );
}

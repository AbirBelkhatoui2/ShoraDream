import { createContext } from "react";

export const DreamsContext = createContext();

export function DreamsProvider({ children }) {
  const dreams = [
    {
      id: 1,
      title: "Mon premier rêve",
      audio: "",
      stars: 5,
    },
  ];

  return (
    <DreamsContext.Provider value={{ dreams }}>
      {children}
    </DreamsContext.Provider>
  );
}

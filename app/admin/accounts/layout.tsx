import { ReactNode } from "react";

export default function AccountsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style>{`main form + div > button:nth-child(4){display:none!important}`}</style>
    </>
  );
}

import { useContext } from 'react';
import { OrgContext } from './org-context';

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error('useOrg deve ser usado dentro de OrgProvider.');
  }

  return context;
}

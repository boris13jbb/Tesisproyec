import type { ChangeEvent } from 'react';
import type { FieldPath, FieldValues, UseFormRegister } from 'react-hook-form';
import { toAdministrativeInputUppercase } from './text-normalize';

/** onChange para campos controlados con useState. */
export function administrativeInputOnChange(setValue: (value: string) => void) {
  return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValue(toAdministrativeInputUppercase(e.target.value));
  };
}

/** Registro RHF con mayúsculas en tiempo real (texto administrativo). */
export function bindAdministrativeRegister<T extends FieldValues>(
  register: UseFormRegister<T>,
  name: FieldPath<T>,
) {
  const registration = register(name);
  return {
    ...registration,
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const next = toAdministrativeInputUppercase(e.target.value);
      void registration.onChange({ ...e, target: { ...e.target, value: next } });
    },
  };
}

/** Registro RHF para códigos de catálogo (mayúsculas en tiempo real). */
export function bindAdministrativeCodigoRegister<T extends FieldValues>(
  register: UseFormRegister<T>,
  name: FieldPath<T>,
) {
  return bindAdministrativeRegister(register, name);
}

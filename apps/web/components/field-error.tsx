interface FieldErrorProps {
  id: string;
  message?: string;
}

export function FieldError({ id, message }: FieldErrorProps) {
  if (!message) return null;
  return (
    <span className="fieldError" id={id} role="alert">
      {message}
    </span>
  );
}

export const validationAttributes = (id: string, message?: string) => ({
  'aria-invalid': Boolean(message) as true | false,
  'aria-describedby': message ? id : undefined,
  className: message ? 'invalidField' : undefined,
});

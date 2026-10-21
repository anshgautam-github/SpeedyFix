import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { TextField } from './primitives';

/** Password input with a show/hide control. The value only ever lives in component state; it is never persisted. */
const PasswordField = forwardRef(function PasswordField({ label = 'Password', autoComplete = 'current-password', ...rest }, ref) {
  const [show, setShow] = useState(false);
  return (
    <TextField
      ref={ref}
      label={label}
      type={show ? 'text' : 'password'}
      autoComplete={autoComplete}
      autoCapitalize="none"
      spellCheck={false}
      inputClassName="pr-12"
      right={
        <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-1 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt-glow">
          {show ? <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" /> : <Eye className="h-[18px] w-[18px]" aria-hidden="true" />}
        </button>
      }
      {...rest}
    />
  );
});
export default PasswordField;

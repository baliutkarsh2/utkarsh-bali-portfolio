/**
 * @types/react declares ViewTransition in canary.d.ts rather than index.d.ts.
 * This import exists only to pull in that declaration merge; the module has no
 * runtime existence. Cleaner than adding compilerOptions.types, which would
 * suppress automatic @types inclusion for everything else.
 */
import {} from "react/canary";

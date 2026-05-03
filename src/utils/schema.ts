import {z, type ZodRawShape, type ZodTypeAny} from 'zod';

type AliasMap = Record<string, string>;

/**
 * Strict Zod object that:
 * 1. Accepts aliased parameter names (e.g. `id` → `expense_id`).
 * 2. Rejects any unknown parameters after alias resolution.
 */
export function strictSchemaWithAliases<T extends ZodRawShape>(
	shape: T,
	aliases: AliasMap = {},
): ZodTypeAny {
	const objectSchema = z.object(shape).strict();

	const effectsSchema = z.preprocess((args: unknown) => {
		if (typeof args !== 'object' || args === null) {
			return args;
		}

		const input = args as Record<string, unknown>;
		const result: Record<string, unknown> = {};

		for (const key of Object.keys(input)) {
			const canonicalKey = aliases[key] ?? key;
			if (!(canonicalKey in result)) {
				result[canonicalKey] = input[key];
			}
		}

		return result;
	}, objectSchema);

	// Expose the inner schema's `.shape` on the ZodEffects wrapper. The MCP SDK's
	// JSON-schema generator looks for `.shape` to introspect the field types — without
	// this, it treats the wrapped schema as opaque and falls back to an empty object.
	(effectsSchema as unknown as {shape: T}).shape = objectSchema.shape;

	return effectsSchema;
}

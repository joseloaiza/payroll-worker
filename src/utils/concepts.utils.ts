import { CodesConfigService } from './../config/codes-config/codes-config.service';

export async function getConceptCodes<T extends Record<string, string>>(
  codesConfigService: CodesConfigService,
  conceptIds: T,
): Promise<{ [K in keyof T]: string }> {
  //Promise<Record<keyof T, string>>
  // extract the IDs
  const ids = Object.values(conceptIds);

  // fetch all codes from service
  const codeById = await codesConfigService.getManyCodesByIds(ids);

  const out = {} as { [K in keyof T]: string };

  (Object.keys(conceptIds) as Array<keyof T>).forEach((key) => {
    const id = conceptIds[key];
    const code = codeById[id];
    if (!code) {
      throw new Error(`Missing  code for concept "${String(key)}" (id: ${id})`);
    }
    out[key] = code;
  });

  return out;
}

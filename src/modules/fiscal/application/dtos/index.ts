export {
  CreateFiscalDocumentInputSchema,
  type CreateFiscalDocumentInput,
  type CreateFiscalDocumentOutput,
} from './CreateFiscalDocumentDTO';

export {
  type FiscalDocumentResponseDTO,
  type PaginatedFiscalDocumentsDTO,
  toFiscalDocumentResponseDTO,
} from './FiscalDocumentResponseDTO';

export {
  CalculateTaxesInputSchema,
  type CalculateTaxesInput,
  type CalculateTaxesOutput,
} from './CalculateTaxesDTO';

// E7.4.1 Semana 7 - Application Layer (IBS/CBS)
export {
  CalculateIbsCbsInputSchema,
  type CalculateIbsCbsInput,
  type CalculateIbsCbsOutput,
  type CalculateIbsCbsItemInput,
  type CalculateIbsCbsItemOutput,
  type CalculateTotals,
} from './CalculateIbsCbsDto';

export {
  SimulateTaxScenarioInputSchema,
  type SimulateTaxScenarioInput,
  type SimulateTaxScenarioOutput,
  type TaxScenario,
  type TaxComparison,
} from './SimulateTaxScenarioDto';

export {
  CompareTaxRegimesInputSchema,
  type CompareTaxRegimesInput,
  type CompareTaxRegimesOutput,
  type CurrentRegimeTaxes,
  type NewRegimeTaxes,
} from './CompareTaxRegimesDto';

export {
  GetTaxRatesInputSchema,
  CalculateCompensationInputSchema,
  type GetTaxRatesInput,
  type GetTaxRatesOutput,
  type TaxRates,
  type CalculateCompensationInput,
  type CalculateCompensationOutput,
} from './TaxRatesDto';

export {
  AuditTaxTransitionInputSchema,
  type AuditTaxTransitionInput,
  type AuditTaxTransitionOutput,
  type CurrentTaxesDto,
  type NewTaxesDto,
} from './AuditTaxTransitionDto';

export {
  ValidateIbsCbsGroupInputSchema,
  type ValidateIbsCbsGroupInput,
  type ValidateIbsCbsGroupOutput,
  type ValidationError,
  type ValidationWarning,
} from './ValidateIbsCbsGroupDto';


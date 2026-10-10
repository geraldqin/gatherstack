import { t } from "~shared/i18n"

export class DriverNotImplementedError extends Error {
  constructor(driver: string) {
    super(t("errorDriverNotImplemented", [driver]))
    this.name = "DriverNotImplementedError"
  }
}

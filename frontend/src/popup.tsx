import { CountButton } from "~features/count-button";
import { AppConfigProvider } from "~hook/useAppConfig";
import { MantineProvider } from "@mantine/core";

import "~style.css";
import { theme } from "~theme";

function IndexPopup() {
  return (
    <div className="plasmo-flex plasmo-items-center plasmo-justify-center plasmo-h-16 plasmo-w-40">
      <CountButton />
    </div>
  );
}

const WrappedPopup = () => (
  <MantineProvider theme={theme}>
    <AppConfigProvider>
      <IndexPopup />
    </AppConfigProvider>
  </MantineProvider>
);


export default WrappedPopup;

const handleManufactureYearChange = (
  value: string,
  onChange: (field: string, value: string) => void,
) => {
  const numericValue = value.replace(/\D/g, "").slice(0, 4);

  let formattedValue = numericValue;

  if (numericValue.length > 2) {
    formattedValue = `${numericValue.slice(0, 2)}/${numericValue.slice(2)}`;
  }

  onChange("manufactureYear", formattedValue);
};
/*
Select a license or enter a license code.

Component takes as input data that describes a licens.

IMPORTANT: this component must work in *both* from nextjs and static.
*/

import { useRef, useMemo, useState } from "react";
import { Alert, Button, Checkbox, Select, Space } from "antd";
const { Option } = Select;
import { isValidUUID, days_ago as daysAgo, len } from "@cocalc/util/misc";
import { describe_quota as describeQuota } from "@cocalc/util/db-schema/site-licenses";
import { keys } from "lodash";

interface License {
  expires?: Date;
  title?: string;
  quota?: object;
}

interface Props {
  onSave: (licenseId: string) => void;
  onCancel: () => void;
  exclude?: string[];
  managedLicenses: { [id: string]: License };
}

export default function SelectLicense({
  onSave,
  onCancel,
  exclude,
  managedLicenses,
}: Props) {
  const isBlurredRef = useRef<boolean>(true);
  const [licenseId, setLicenseId] = useState<string>("");
  const [showAll, setShowAll] = useState<boolean>(false);
  const licenseIds: string[] = useMemo(() => {
    if (showAll) {
      return keys(managedLicenses);
    }
    const yesterday = daysAgo(1);
    const v: string[] = [];
    for (const id in managedLicenses) {
      const { expires } = managedLicenses[id] ?? {};
      if (expires == null || expires >= yesterday) {
        v.push(id);
      }
    }
    return v;
  }, [managedLicenses, showAll]);

  const options: JSX.Element[] = useMemo(() => {
    const v: JSX.Element[] = [];
    for (const id of licenseIds) {
      if (exclude?.includes(id)) continue;
      const { title, quota, expires } = managedLicenses[id] ?? {};
      v.push(
        <Option key={id} value={id}>
          <Alert
            style={{
              marginRight: "15px",
              padding:
                "3px 15px" /* padding is so it looks centered *after* being selected.*/,
            }}
            type={expires && expires <= new Date() ? "error" : "warning"}
            message={
              <>
                <span style={{ fontFamily: "monospace" }}>{id}</span>
                <span style={{ color: "#666" }}>
                  {title ? " - " + title : ""}
                  <br />
                  {quota && describeQuota(quota, true)}
                  {expires && <span>Expires {expires.toLocaleString()}</span>}
                </span>
              </>
            }
          />
        </Option>
      );
    }
    return v;
  }, [managedLicenses, licenseIds]);

  const valid = isValidUUID(licenseId);

  return (
    <div>
      <Select
        style={{ width: "80%", margin: "5px 0" }}
        placeholder={
          "Enter license code " +
          (options.length > 0
            ? `or select from the ${options.length} licenses you manage`
            : "")
        }
        value={licenseId ? licenseId : undefined}
        onBlur={() => {
          isBlurredRef.current = true;
        }}
        onFocus={() => {
          isBlurredRef.current = false;
        }}
        onChange={(value) => {
          setLicenseId(value);
        }}
        onSearch={(value) => {
          // we **abuse** search to let user enter any license key they want!
          if (isBlurredRef.current) return; // hack since blur when text is not in list clears things.
          setLicenseId(value);
        }}
        notFoundContent={null}
        showSearch
        allowClear
      >
        {options}
      </Select>

      {(showAll || licenseIds.length < len(managedLicenses)) && (
        <Checkbox
          style={{ marginLeft: "15px", fontWeight: 450 }}
          checked={showAll}
          onChange={() => setShowAll(!showAll)}
        >
          Show all
        </Checkbox>
      )}

      <br />
      <Space>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          disabled={!valid}
          type="primary"
          onClick={() => {
            onSave(licenseId);
          }}
        >
          Save
        </Button>
        {!valid && licenseId && (
          <Alert
            style={{ margin: "15px" }}
            type="error"
            message="Valid license keys are 36 characters long."
          />
        )}
      </Space>
    </div>
  );
}
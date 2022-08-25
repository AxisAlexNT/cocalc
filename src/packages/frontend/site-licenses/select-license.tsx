/*
Select a license or enter a license code.

Component takes as input data that describes a licens.

IMPORTANT: this component must work in *both* from nextjs and static.
*/

import { CSS, Rendered } from "@cocalc/frontend/app-framework";
import { Icon } from "@cocalc/frontend/components/icon";
import { describe_quota as describeQuota } from "@cocalc/util/licenses/describe-quota";
import { days_ago as daysAgo, isValidUUID, len } from "@cocalc/util/misc";
import { Alert, Button, Checkbox, Select, Space } from "antd";
import { keys } from "lodash";
import { ReactNode, useMemo, useRef, useState } from "react";

const { Option } = Select;

export interface License {
  expires?: Date;
  title?: string;
  quota?: object;
}

interface Props {
  onSave?: (licenseId: string) => void;
  onChange?: (licenseId: string | undefined) => void; // called with licensed id or undefined when cleared.
  onCancel?: () => void;
  exclude?: string[];
  managedLicenses: { [id: string]: License };
  defaultLicenseId?: string;
  confirmLabel?: ReactNode;
  style?: CSS;
}

export default function SelectLicense(props: Props) {
  const {
    defaultLicenseId,
    onSave,
    onChange,
    onCancel,
    exclude,
    managedLicenses,
    confirmLabel,
    style,
  } = props;
  const isBlurredRef = useRef<boolean>(true);
  const [licenseId, setLicenseId] = useState<string>(defaultLicenseId ?? "");
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
                  {expires && <span>, Expires {expires.toLocaleString()}</span>}
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

  function renderButton(): Rendered {
    if (!(onSave || onCancel)) return;

    return (
      <Space>
        {onSave && (
          <Button
            disabled={!valid}
            type="primary"
            onClick={() => {
              onSave(licenseId);
            }}
          >
            <Icon name="check" /> {confirmLabel ?? "Apply License"}
          </Button>
        )}
        {onCancel && <Button onClick={onCancel}>Cancel</Button>}
      </Space>
    );
  }

  return (
    <div style={style}>
      <div style={{ width: "100%", display: "flex" }}>
        <Select
          style={{ margin: "5px 15px 10px 0", flex: 1 }}
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
            onChange?.(value);
            setLicenseId(value);
          }}
          onSearch={(value) => {
            // we **abuse** search to let user enter any license key they want!
            if (isBlurredRef.current) return; // hack since blur when text is not in list clears things.
            onChange?.(value);
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
            style={{ marginTop: "10px", color: "#666", whiteSpace: "nowrap" }}
            checked={showAll}
            onChange={() => setShowAll(!showAll)}
          >
            Show expired
          </Checkbox>
        )}
      </div>
      {renderButton()}
      {!valid && licenseId && (
        <Alert
          style={{ margin: "15px" }}
          type="error"
          message="Valid license keys are 36 characters long."
        />
      )}
    </div>
  );
}

import SmartAnchorTag from "@cocalc/frontend/components/smart-anchor-tag";

interface Options {
  project_id: string;
  path: string;
}

export default function getAnchorTagComponent({ project_id, path }: Options) {
  return ({ href, title, children }) => (
    <SmartAnchorTag
      project_id={project_id}
      path={path}
      href={href}
      title={title}
    >
      {children}
    </SmartAnchorTag>
  );
}

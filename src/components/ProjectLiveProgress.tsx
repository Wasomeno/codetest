import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

export interface StreamBannerData {
  message: string;
  stage?: string;
  type?: string;
  title: string;
  tone: "success" | "error";
  stepInfo?: { currentStep?: number; totalSteps?: number; stepName?: string };
}

export interface ProjectLiveProgressProps {
  banner: StreamBannerData | null;
  reduce?: boolean | null;
}

export function ProjectLiveProgress({ banner, reduce }: ProjectLiveProgressProps) {
  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          key="project-live-progress"
          role="status"
          data-od-id="project-live-progress"
          initial={
            reduce
              ? { opacity: 0 }
              : { opacity: 0, y: -8, height: 0, marginBottom: 0 }
          }
          animate={
            reduce
              ? { opacity: 1 }
              : { opacity: 1, y: 0, height: "auto", marginBottom: 16 }
          }
          exit={
            reduce
              ? { opacity: 0 }
              : { opacity: 0, y: -6, height: 0, marginBottom: 0 }
          }
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          style={{
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03), 0 4px 12px rgba(0, 0, 0, 0.02)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 16px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Left cluster */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              {/* Status Indicator Icon */}
              {banner.stage === "error" ? (
                <AlertCircle
                  size={14}
                  style={{ color: "var(--danger)", flexShrink: 0 }}
                  aria-hidden="true"
                />
              ) : banner.stage === "done" ? (
                <CheckCircle2
                  size={14}
                  style={{ color: "var(--success)", flexShrink: 0 }}
                  aria-hidden="true"
                />
              ) : (
                <motion.span
                  animate={reduce ? undefined : { rotate: 360 }}
                  transition={
                    reduce
                      ? undefined
                      : { repeat: Infinity, duration: 1.2, ease: "linear" }
                  }
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  aria-hidden="true"
                >
                  <Loader2 size={13} style={{ color: "var(--accent)" }} />
                </motion.span>
              )}

              {/* Micro status badge */}
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "2px 7px",
                  borderRadius: 4,
                  lineHeight: 1.3,
                  flexShrink: 0,
                  ...(banner.stage === "error"
                    ? {
                        background: "oklch(60% 0.18 25 / 0.10)",
                        color: "var(--danger)",
                        border: "1px solid oklch(60% 0.18 25 / 0.20)",
                      }
                    : banner.stage === "done"
                      ? {
                          background: "oklch(62% 0.15 150 / 0.10)",
                          color: "var(--success)",
                          border: "1px solid oklch(62% 0.15 150 / 0.20)",
                        }
                      : {
                          background: "oklch(70% 0.16 162 / 0.10)",
                          color: "var(--accent-text)",
                          border: "1px solid oklch(70% 0.16 162 / 0.20)",
                        }),
                }}
              >
                {getBadgeText(banner.type, banner.stage)}
              </span>

              {/* Title */}
              <span
                className="banner-title"
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--fg)",
                  flexShrink: 0,
                }}
              >
                {banner.title}
              </span>

              {/* Separator */}
              <span style={{ color: "var(--muted)", flexShrink: 0 }}>·</span>

              {/* Detail chip */}
              <span
                className="banner-msg"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  background: "oklch(97% 0.003 250)",
                  border: "1px solid var(--border)",
                  padding: "2px 8px",
                  borderRadius: 4,
                  color: "var(--fg)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 520,
                }}
                title={banner.message}
              >
                {banner.message}
              </span>
            </div>

            {/* Right cluster */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                flexShrink: 0,
                marginLeft: 16,
              }}
            >
              {banner.stepInfo?.currentStep && banner.stepInfo?.totalSteps ? (
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    color: "var(--muted)",
                  }}
                >
                  Step {banner.stepInfo.currentStep} of {banner.stepInfo.totalSteps}
                </span>
              ) : banner.stage !== "done" && banner.stage !== "error" ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: "var(--accent)",
                      boxShadow: "0 0 6px var(--accent)",
                      display: "inline-block",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      color: "var(--muted)",
                    }}
                  >
                    LIVE
                  </span>
                </div>
              ) : null}
            </div>

            {/* Hairline Progress Track */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 2,
                background: "oklch(93% 0.005 250)",
                overflow: "hidden",
              }}
            >
              {banner.stage === "done" ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "var(--success)",
                  }}
                />
              ) : banner.stage === "error" ? (
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    background: "var(--danger)",
                  }}
                />
              ) : banner.stepInfo?.currentStep && banner.stepInfo?.totalSteps ? (
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        (banner.stepInfo.currentStep / banner.stepInfo.totalSteps) * 100
                      )
                    )}%`,
                    height: "100%",
                    background: "var(--accent)",
                    transition: reduce
                      ? undefined
                      : "width 300ms cubic-bezier(0.16, 1, 0.3, 1)",
                  }}
                />
              ) : (
                <motion.div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: "40%",
                    background:
                      "linear-gradient(90deg, transparent 0%, var(--accent) 50%, transparent 100%)",
                  }}
                  initial={reduce ? { left: "30%" } : { left: "-40%" }}
                  animate={reduce ? undefined : { left: "100%" }}
                  transition={
                    reduce
                      ? undefined
                      : {
                          repeat: Infinity,
                          duration: 1.6,
                          ease: "easeInOut",
                        }
                  }
                />
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getBadgeText(type?: string, stage?: string): string {
  const isGen = type === "generation";
  if (isGen) {
    if (stage === "done") return "GENERATION COMPLETE";
    if (stage === "error") return "GENERATION FAILED";
    return "GENERATION";
  }
  if (stage === "done") return "COMPLETE";
  if (stage === "error") return "FAILED";
  return "LIVE SYNC";
}

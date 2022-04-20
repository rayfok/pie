import Button from "@material-ui/core/Button";
import InfoIcon from "@mui/icons-material/Info";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import React, { Component } from "react";
import ExitSurvey from "./ExitSurvey";
import ProgressIndicator from "./ProgressIndicator";
import Tooltip from "@mui/material/Tooltip";

const APPLICATION_ROOT = "";
const N_QUESTIONS = 1;

class MainTask extends Component {
  urlParams = new URLSearchParams(window.location.search);
  featureDisplayNameMap = {
    compas: {
      age: "Age",
      sex: "Sex",
      c_charge_degree: "Charge Degree",
      juv_fel_count: "Juvenile Felony Count",
      juv_misd_count: "Juvenile Misdemeanor Count",
      priors_count: "Prior Charges Count",
    },
  };
  featureDescMap = {
    compas: {
      age: "Age of the defendant.",
      sex: "Biological sex designated at birth.",
      c_charge_degree:
        "Severity of the charged crime. Crimes are classified as either misdemeanors (less serious crimes) or felonies (more serious crimes)",
      juv_fel_count:
        "Number of felony crimes commited while the defendant was a juvenile (under the age of eighteen).",
      juv_misd_count:
        "Number of misdemeanor crimes commited while the defendant was a juvenile (under the age of eighteen).",
      priors_count: "Total number of prior charges against the defendant.",
    },
  };

  constructor(props) {
    super(props);
    this.state = {
      questions: null,
      responses: [],
      completedCount: 0,
      workerId: this.urlParams.get("workerId"),
      assignmentId: this.urlParams.get("assignmentId"),
      hitId: this.urlParams.get("hitId"),
      turkSubmitTo: this.urlParams.get("turkSubmitTo"),
      task: this.urlParams.get("task"),
      condition: this.urlParams.get("condition"),
      questionStartTime: -1,
      initialDecisionTime: -1,
      finalDecisionTime: -1,
      initialDecision: null,
      finalDecision: null,
      curDecision: null,
      curQuestion: null,
      showMainTask: false,
      finished: false,
      previouslyCompleted: false,
    };
  }

  componentDidMount() {
    this.checkHasPreviouslyCompleted();
    this.getAllQuestions();
  }

  getAllQuestions = () => {
    let url = `${APPLICATION_ROOT}/api/v1/q/?task=${this.state.task}&q=-1`;
    fetch(url, { credentials: "same-origin" })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Something went wrong getting all questions...");
        }
      })
      .then((data) => {
        this.setState(
          {
            questions: Object.values(data)
              .sort((a, b) => parseInt(a.id) - parseInt(b.id))
              .slice(0, N_QUESTIONS),
          },
          this.startTask
        );
      });
  };

  startTask = () => {
    this.setState(
      {
        showMainTask: true,
      },
      this.setNextQuestion
    );
  };

  setNextQuestion = () => {
    this.setState({
      curQuestion: this.state.questions[this.state.completedCount],
      questionStartTime: Date.now(),
      curDecision: null,
      initialDecision: null,
      initialDecisionTime: -1,
      finalDecision: null,
      finalDecisionTime: -1,
      showMachineAssistance: false,
    });
  };

  handleChoiceSelected = (e) => {
    this.setState({
      curDecision: e.target.value,
    });
  };

  handleNextClicked = () => {
    if (this.state.initialDecision === null) {
      this.setState({
        showMachineAssistance: true,
        initialDecision: this.state.curDecision,
        initialDecisionTime: Date.now() - this.state.questionStartTime,
        curDecision: null,
      });
    } else {
      const response = {
        worker_id: this.state.workerId,
        hit_id: this.state.hitId,
        assignment_id: this.state.assignmentId,
        task: this.state.task,
        condition: this.state.condition,
        question_id: this.state.curQuestion["id"],
        initial_human_decision: this.state.initialDecision,
        final_human_decision: this.state.curDecision,
        ai_decision: this.state.curQuestion["preds"]["lgr"],
        initial_decision_time: this.state.initialDecisionTime,
        final_decision_time: Date.now() - this.state.questionStartTime,
      };
      this.setState(
        (prevState) => ({
          completedCount: prevState.completedCount + 1,
          responses: [...prevState.responses, response],
        }),
        () => {
          if (this.state.completedCount >= this.state.questions.length) {
            this.submitData();
            this.setState({ finished: true });
          } else {
            this.setNextQuestion();
          }
        }
      );
    }
  };

  submitData = () => {
    let url = `${APPLICATION_ROOT}/api/v1/submit/`;
    fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      credentials: "same-origin",
      body: JSON.stringify({
        responses: this.state.responses,
      }),
    }).then(this.setState({ showMainTask: false, finished: true }));
  };

  submitMTurk = () => {
    if (this.state.turkSubmitTo !== null) {
      const form = document.getElementById("final-submit-form");
      form.submit();
    } else {
      location.reload();
    }
  };

  checkHasPreviouslyCompleted = () => {
    if (this.state.workerId !== null) {
      let url = `${APPLICATION_ROOT}/api/v1/completed/?workerId=${this.state.workerId}&task=${this.state.task}`;
      fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        credentials: "same-origin",
      })
        .then((response) => {
          if (response.ok) {
            return response.json();
          } else {
            throw new Error("Something went wrong ...");
          }
        })
        .then((data) => {
          this.setState({
            previouslyCompleted: data["completed"],
          });
        });
    }
  };

  getMTurkSubmitForm = () => {
    return (
      <form
        id="final-submit-form"
        action={this.state.turkSubmitTo + "/mturk/externalSubmit"}
        method="POST"
      >
        <input
          type="hidden"
          name="assignmentId"
          value={this.state.assignmentId || ""}
        />
        <input type="hidden" name="nonce" value={"ray" + Math.random()} />
      </form>
    );
  };

  render() {
    const {
      task,
      questions,
      curQuestion,
      curDecision,
      initialDecision,
      showMainTask,
      completedCount,
      showMachineAssistance,
      finished,
    } = this.state;

    if (!questions) {
      return (
        <div>If this page does not load, please return the HIT. Sorry!</div>
      );
    }

    return (
      <React.Fragment>
        {this.getMTurkSubmitForm()}

        {finished && <ExitSurvey submitMTurk={this.submitMTurk} />}

        {!finished && curQuestion && showMainTask && (
          <div id="main-task-container">
            <ProgressIndicator
              value={(completedCount / questions.length) * 100}
            />

            <div id="task-description-container">
              <span id="task-description">
                Please review the following profile and consider whether this
                defendant is likely to reoffend within the next two years.
              </span>
            </div>

            <div id="task-features-container">
              <p id="task-section-header">Defendant Profile</p>
              <TableContainer>
                <Table sx={{ maxWidth: 400 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>{<b>Feature</b>}</TableCell>
                      <TableCell align="right">{<b>Value</b>}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(curQuestion["features"])
                      .filter(([k, _]) =>
                        this.featureDisplayNameMap[task].hasOwnProperty(k)
                      )
                      .map(([k, v]) => (
                        <TableRow key={k}>
                          <TableCell component="th" scope="row">
                            {this.featureDisplayNameMap[task][k]}
                            <Tooltip title={this.featureDescMap[task][k]}>
                              <IconButton>
                                <InfoIcon sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                          <TableCell align="right">{v}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </div>

            <div id="task-choices-container">
              <p className="prompt-text">
                Do you think this defendant will reoffend within two years?
              </p>
              <FormControl className="choices">
                <RadioGroup row>
                  <FormControlLabel
                    value="yes"
                    control={<Radio />}
                    onChange={this.handleChoiceSelected}
                    disabled={initialDecision !== null}
                    label={
                      <span>
                        Yes, I think they <b>will</b> reoffend.
                      </span>
                    }
                  />
                  <FormControlLabel
                    value="no"
                    control={<Radio />}
                    onChange={this.handleChoiceSelected}
                    disabled={initialDecision !== null}
                    label={
                      <span>
                        No, I think they <b>will not</b> reoffend.
                      </span>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </div>

            {showMachineAssistance && (
              <div id="ai-assist-container">
                <div id="ai-decision">AI Decision</div>
                <div id="ai-explanation">AI Explanation</div>
                <p className="prompt-text">
                  Now, do you think this defendant will reoffend within two
                  years?
                </p>
                <FormControl className="choices">
                  <RadioGroup row>
                    <FormControlLabel
                      value="yes"
                      control={<Radio />}
                      onChange={this.handleChoiceSelected}
                      label={
                        <span>
                          Yes, I think they <b>will</b> reoffend.
                        </span>
                      }
                    />
                    <FormControlLabel
                      value="no"
                      control={<Radio />}
                      onChange={this.handleChoiceSelected}
                      label={
                        <span>
                          No, I think they <b>will not</b> reoffend.
                        </span>
                      }
                    />
                  </RadioGroup>
                </FormControl>
              </div>
            )}

            <div id="task-buttons-container">
              <Button
                variant="contained"
                color="primary"
                className="centered button"
                onClick={this.handleNextClicked}
                disabled={curDecision === null}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </React.Fragment>
    );
  }
}

export default MainTask;
